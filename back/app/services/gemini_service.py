import json
import re
from datetime import date, datetime
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.models.user import User
from app.models.client import Client
from app.models.workplace import Workplace
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate
from app.services.appointment_service import create_appointment

# Initialize Gemini
if settings.GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
else:
    gemini_client = None


def _extract_json(text: str) -> dict:
    match = re.search(r"```(?:json)?(.*?)```", text, re.DOTALL)
    json_str = match.group(1).strip() if match else text.strip()
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print("Json parse error:", e, "on text:", json_str)
        return {"intent": "OUTROS", "message": "Erro ao interpretar comando."}


def process_user_message(db: Session, current_user: User, user_message: str) -> str:
    if not gemini_client:
        return "Erro: A chave do Gemini (GEMINI_API_KEY) não está configurada no servidor."

    today = date.today()
    system_prompt = f"""
Você é um assistente virtual inteligente do sistema de agendamentos "Velo".
Seu papel é interpretar o que o usuário deseja e retornar ESTRITAMENTE um JSON válido, sem nenhum texto extra.
Hoje é {today.strftime("%d/%m/%Y")}, {today.strftime("%A")}.

As intenções possíveis (campo "intent") são:
1. "AGENDAR_CONSULTA": Quando o usuário quer marcar horário.
2. "BUSCAR_CONSULTAS": Quando o usuário quer listar horários.
3. "OUTROS": Para perguntas normais ou bate-papo.

Se for AGENDAR_CONSULTA, extraia os campos no formato (retorne null se não houver):
{{
  "intent": "AGENDAR_CONSULTA",
  "data": {{
      "client_name": "nome do cliente",
      "workplace_name": "nome do local (ex: clinica, consultorio, centro)",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM"
  }}
}}

Se for BUSCAR_CONSULTAS, extraia (retorne null se não houver):
{{
  "intent": "BUSCAR_CONSULTAS",
  "data": {{
      "cpf": "cpf se fornecido (apenas números ou formatado)",
      "client_name": "nome se fornecido",
      "date": "YYYY-MM-DD"
  }}
}}

Se for OUTROS:
{{
  "intent": "OUTROS",
  "message": "Sua resposta natural e educada aqui, ajudando o usuário no que for preciso."
}}
"""

    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
            ),
        )
        gemini_response = response.text
    except Exception as e:
        return f"Desculpe, a IA está indisponível no momento. Detalhes: {str(e)}"

    parsed = _extract_json(gemini_response)
    intent = parsed.get("intent", "OUTROS")

    if intent == "OUTROS":
        return parsed.get("message", "Como posso ajudar?")

    elif intent == "AGENDAR_CONSULTA":
        data = parsed.get("data", {})
        c_name = data.get("client_name")
        w_name = data.get("workplace_name")
        a_date = data.get("date")
        s_time = data.get("start_time")
        e_time = data.get("end_time")

        if not c_name:
            return "Poderia informar o nome do cliente para o agendamento?"
        if not a_date or not s_time:
            return "Poderia me confirmar a data e o horário de início da consulta?"
        if not e_time:
            # Assume 1 hour
            dt_start = datetime.strptime(s_time, "%H:%M")
            dt_end = datetime(2000,1,1, dt_start.hour, dt_start.minute) + datetime.timedelta(hours=1)
            e_time = dt_end.strftime("%H:%M")

        # Buscar Client
        client = db.query(Client).filter(
            Client.user_id == current_user.id,
            Client.name.ilike(f"%{c_name}%")
        ).first()
        if not client:
            return f"Não encontrei nenhum cliente com o nome '{c_name}' na sua base de dados."

        # Buscar Workplace
        workplace_query = db.query(Workplace).filter(Workplace.user_id == current_user.id)
        if w_name:
            workplace_query = workplace_query.filter(Workplace.name.ilike(f"%{w_name}%"))
        workplace = workplace_query.first()
        if not workplace:
            return "Não consegui identificar o local de trabalho. Por favor, verifique se está cadastrado."

        # Tentar agendar
        try:
            appt_data = AppointmentCreate(
                workplace_id=workplace.id,
                client_id=client.id,
                date=datetime.strptime(a_date, "%Y-%m-%d").date(),
                start_time=datetime.strptime(s_time, "%H:%M").time(),
                end_time=datetime.strptime(e_time, "%H:%M").time(),
            )
            created_appt = create_appointment(db, current_user.id, appt_data)
            
            # Format reply to user
            fmt_date = created_appt[0].date.strftime("%d/%m/%Y")
            fmt_start = created_appt[0].start_time.strftime("%H:%M")
            return f"Consulta agendada com sucesso para {client.name} em {workplace.name}, no dia {fmt_date} às {fmt_start}!"
        except Exception as e:
            return f"Não foi possível agendar devido a uma restrição: {getattr(e, 'detail', str(e))}"

    elif intent == "BUSCAR_CONSULTAS":
        data = parsed.get("data", {})
        cpf_filter = data.get("cpf")
        name_filter = data.get("client_name")
        date_filter = data.get("date")

        clients_query = db.query(Client).filter(Client.user_id == current_user.id)
        
        has_filter = False
        if cpf_filter:
            cpf_clean = re.sub(r"\\D", "", cpf_filter)
            if cpf_clean:
                clients_query = clients_query.filter(Client.cpf.ilike(f"%{cpf_clean}%"))
                has_filter = True
        
        if name_filter:
            clients_query = clients_query.filter(Client.name.ilike(f"%{name_filter}%"))
            has_filter = True
            
        if not has_filter and not date_filter:
            return "Poderia fornecer um nome, CPF ou data para que eu possa buscar as consultas?"

        found_clients = clients_query.all()
        client_ids = [c.id for c in found_clients]

        appt_query = db.query(Appointment).filter(Appointment.user_id == current_user.id)
        if client_ids:
            appt_query = appt_query.filter(Appointment.client_id.in_(client_ids))
        elif has_filter:
            # provided nome/cpf but found no clients
            return "Não encontrei nenhum cliente com os dados fornecidos."
        
        if date_filter:
            try:
                dt_obj = datetime.strptime(date_filter, "%Y-%m-%d").date()
                appt_query = appt_query.filter(Appointment.date == dt_obj)
            except:
                pass
                
        # Only fetch future/today unless specifically requested past, we will just fetch recent/future ones
        appt_query = appt_query.order_by(Appointment.date.asc(), Appointment.start_time.asc()).limit(15)
        appointments = appt_query.all()

        if not appointments:
            return "Não encontrei nenhuma consulta com esses critérios."

        # Pass data back to Gemini to formulate a nice response
        results_str = "\\n".join([
            f"- {a.date.strftime('%d/%m/%Y')} {a.start_time.strftime('%H:%M')} a {a.end_time.strftime('%H:%M')} | Cliente: {a.client.name} | Local: {a.workplace.name}"
            for a in appointments
        ])

        summary_prompt = f"""
Você é o assistente Velo. Eu busquei as consultas no banco de dados baseando-me no pedido do usuário.
Aqui estão os resultados encontrados:

{results_str}

Formule uma resposta educada e concisa ao usuário listando esses agendamentos de forma clara. Cuidado com o tom robótico, seja amigável. Retorne apenas o texto final.
"""
        try:
            res = gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=summary_prompt,
            )
            return res.text
        except:
            return f"Encontrei as seguintes consultas:\\n{results_str}"

    return "Desculpe, não consegui entender o seu pedido. Poderia reformular?"

def generate_dashboard_insights(db: Session, current_user: User) -> str:
    from app.services.dashboard_service import get_dashboard_metrics
    
    if not gemini_client:
        return "Erro: A chave do Gemini (GEMINI_API_KEY) não está configurada no servidor."
        
    metrics = get_dashboard_metrics(db, current_user.id)
    
    # Format the data for the LLM
    top_workplaces = [f"{w['workplace_name']} ({w['client_count']} clientes)" for w in metrics['top_workplaces']]
    week_freq = [f"{d['day_name']}: {d['count']}" for d in metrics['appointments_by_day']]
    time_peaks = [f"{t['time_range']}: {t['count']}" for t in metrics['appointments_by_time']]
    
    resumo_texto = f"""
    Métricas recentes de {current_user.name}:
    - Agendamentos cancelados: {metrics['canceled_count']}
    - Reagendamentos: {metrics['rescheduled_count']}
    - Locais mais movimentados: {', '.join(top_workplaces) if top_workplaces else 'Nenhum por enquanto'}
    - Frequência na semana: {', '.join(week_freq) if week_freq else 'Nenhuma'}
    - Picos de horário: {', '.join(time_peaks) if time_peaks else 'Nenhum'}
    """
    
    prompt = f"""
Você é o Assistente Virtual (Consultor de Negócios) do sistema de agendamentos "Velo".
Seu papel agora não é agendar ou buscar conversas, mas sim analisar o desempenho do negócio do usuário e dar uma DICA acionável e um INSIGHT.
Seja conciso, inspirador e estratégico no tom de voz. 
Se os dados estiverem zerados ou muito baixos, incentive o usuário a compartilhar o seu link de agendamento na Bio das redes sociais.

Analise estritamente este mini-relatório:
{resumo_texto}

Regras de formatação (OBRIGATÓRIO):
- Retorne apenas texto (Use formatação Markdown leve: negrito para destaques e emojis).
- Não use títulos H1 grandes (ex: # Título), use apenas **negrito** ou no máximo H3 (###).
- Estrutura sugerida: Um pequeno parágrafo de análise + 1 ou 2 bullet points rápidos com dicas do que o profissional pode melhorar ou aproveitar de bom.
"""
    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Não foi possível gerar os insights agora. Tente novamente mais tarde."
