"""
Script para popular o banco de dados com dados realistas e completos
especialmente preparados para demonstrações e entrevistas.
Foco: Métricas, Dashboard Financeiro, Locais, Pacientes, Calendário,
Prontuários e Notificações.
"""

import sys
import os
from datetime import date, time, datetime, timedelta
import random

# Garante acesso aos módulos da aplicação
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.models.workplace import Workplace
from app.models.client import Client
from app.models.workplace_client import WorkplaceClient
from app.models.appointment import Appointment
from app.models.review import Review
from app.models.medical_record import MedicalRecord
from app.models.goal_history import GoalHistory
from app.models.notification_log import NotificationLog
from app.services.security import encrypt_data

def run_seed():
    db = SessionLocal()
    try:
        print("-> Iniciando população da base de demonstração para entrevista...")

        # 1. Obter ou validar o Usuário Principal (Dr. Mateus)
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = db.query(User).filter(User.email == "mateuspedriniwolf@gmail.com").first()
        
        if not user:
            print("ERRO: Usuário ID 1 ou mateuspedriniwolf@gmail.com não encontrado!")
            return

        print(f"-> Usuário encontrado: {user.name} ({user.email})")

        # Atualizar dados do profissional para brilhar na entrevista
        user.monthly_goal = 22000.0  # Meta mensal de R$ 22.000,00
        user.multiple_workplaces = True
        user.niche = "clinical"
        user.crm = "CRM/SC 34.912"
        db.commit()

        # 2. Configurar 3 Locais de Atendimento (Workplaces) modernos
        workplaces_def = [
            {
                "id": 1,
                "name": "Hospital Baía Sul",
                "description": "Centro Médico Hospital Baía Sul - Consultas clínicas e acompanhamento de alta complexidade.",
                "address": "Rua Menino Deus, 63",
                "number": "Sala 402 - Torre Florianópolis",
                "cep": "88020-210",
                "work_days": "1,2,3,4,5",
                "start_time": time(8, 0),
                "end_time": time(18, 0),
                "photo_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
                "buffer_time": 10
            },
            {
                "name": "Clínica Médica Santa Mônica",
                "description": "Consultório privativo com foco em medicina preventiva, check-up executivo e longevidade.",
                "address": "Av. Madre Benvenuta, 1240",
                "number": "Sala 108",
                "cep": "88035-001",
                "work_days": "1,3,5",
                "start_time": time(8, 30),
                "end_time": time(19, 0),
                "photo_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
                "buffer_time": 15
            },
            {
                "name": "Consultório Beira-Mar Premium",
                "description": "Espaço integrado para atendimentos executivos, segunda opinião e procedimentos ambulatoriais.",
                "address": "Av. Jornalista Rubens de Arruda Ramos, 2304",
                "number": "Andar 12",
                "cep": "88015-702",
                "work_days": "2,4,6",
                "start_time": time(9, 0),
                "end_time": time(17, 30),
                "photo_url": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
                "buffer_time": 10
            }
        ]

        workplaces = []
        for wp_data in workplaces_def:
            wp = None
            if "id" in wp_data:
                wp = db.query(Workplace).filter(Workplace.id == wp_data["id"]).first()
            if not wp:
                wp = db.query(Workplace).filter(Workplace.user_id == user.id, Workplace.name == wp_data["name"]).first()
            
            if wp:
                for k, v in wp_data.items():
                    if k != "id":
                        setattr(wp, k, v)
            else:
                wp = Workplace(user_id=user.id, **wp_data)
                db.add(wp)
            db.flush()
            workplaces.append(wp)

        db.commit()
        print(f"-> {len(workplaces)} Locais de atendimento prontos e configurados.")

        # 3. Pacientes (30 pacientes com perfis reais e notas clínicas)
        patients_data = [
            ("Mariana Costa Valente", "mariana.valente@gmail.com", "(48) 99124-8832", "Paciente com histórico de enxaqueca com aura. Em profilaxia e rotina semestral."),
            ("Carlos Eduardo Fontes", "carlos.fontes@outlook.com", "(48) 98834-1190", "Acompanhamento de hipertensão arterial sistêmica e dislipidemia controladas."),
            ("Beatriz Mendonça Ramos", "beatriz.ramos@yahoo.com.br", "(48) 99651-4022", "Check-up preventivo anual. Praticante de corrida, sem queixas articulares."),
            ("Roberto de Souza Dias", "roberto.dias@empresa.com.br", "(48) 99912-3044", "Avaliação cardiológica e teste ergométrico periódicos. Boa evolução."),
            ("Juliana Meireles Castro", "ju.meireles@gmail.com", "(48) 98402-9911", "Tratamento de hipotireoidismo compensado com Levotiroxina 50mcg."),
            ("Guilherme Siqueira Lima", "guilherme.lima@icloud.com", "(48) 99188-7722", "Retorno pós-trauma leve em membro superior direito. Reabilitação concluída."),
            ("Camila Albuquerque", "camila.albuquerque@hotmail.com", "(48) 99870-1234", "Acompanhamento nutricional e metabólico. Perda de peso sustentada."),
            ("Felipe Vasconcelos", "felipe.vasconcelos@gmail.com", "(48) 99115-4433", "Rotina preventiva executiva. Solicitação de painel metabólico completo."),
            ("Larissa Peixoto Guimarães", "larissa.guimaraes@gmail.com", "(48) 99633-8821", "Histórico familiar de diabetes tipo 2. Glicemia de jejum controlada."),
            ("Thiago Antunes Becker", "thiago.becker@uol.com.br", "(48) 98845-6677", "Consulta de rotina e renovação de receituário contínuo."),
            ("Fernanda Bittencourt", "fer.bittencourt@gmail.com", "(48) 99190-2211", "Alergia a AINEs e dipirona registrada no prontuário. Alerta ativo."),
            ("Lucas Martins Moreira", "lucas.moreira@outlook.com", "(48) 99601-3344", "Avaliação pré-participação esportiva e atestado médico para competição."),
            ("Patrícia Diniz Lemos", "patricia.lemos@terra.com.br", "(48) 99988-1122", "Acompanhamento de gastrite crônica com melhora após dieta e IBP."),
            ("André Luis Silveira", "andre.silveira@gmail.com", "(48) 98422-5566", "Paciente ativo, sem comorbidades. Retorno para avaliação de exames."),
            ("Renata Paiva Carvalho", "renata.paiva@gmail.com", "(48) 99144-8899", "Dores ocasionais na coluna lombar. Encaminhada para fisioterapia postural."),
            ("Gustavo Henrique Neves", "gustavo.neves@gmail.com", "(48) 99677-4455", "Rotina anual de prevenção da saúde masculina. PSA e lipidograma normais."),
            ("Vanessa Toledo Farias", "vanessa.toledo@hotmail.com", "(48) 98833-2211", "Controle de asma leve intermitente com broncodilatador de demanda."),
            ("Marcelo Brandão Rocha", "marcelo.rocha@gmail.com", "(48) 99955-6688", "Acompanhamento pós-covid sem sequelas funcionais."),
            ("Carolina Aguiar Pires", "carol.pires@gmail.com", "(48) 99122-3344", "Queixa de insônia e estresse profissional. Orientada sobre higiene do sono."),
            ("Rafael Nogueira Prado", "rafael.prado@outlook.com", "(48) 98455-7788", "Exames laboratoriais e eletrocardiograma sem alterações."),
            ("Amanda Freire Duarte", "amanda.duarte@gmail.com", "(48) 99688-9900", "Acompanhamento de gestação inicial com encaminhamento obstétrico conjunto."),
            ("Bruno Castilho Vianna", "bruno.vianna@gmail.com", "(48) 99100-2233", "Alergia sazonal a ácaros e pólen. Em uso de anti-histamínico."),
            ("Daniela Ribeiro Prado", "dani.prado@yahoo.com.br", "(48) 98877-6655", "Consulta de retorno clínico com melhora dos sintomas álgicos."),
            ("Leandro Cunha Tavares", "leandro.tavares@gmail.com", "(48) 99933-4411", "Check-up preventivo bienal. Sem queixas clínicas atuais."),
            ("Gabriela Porto Alencar", "gabi.alencar@gmail.com", "(48) 99166-5544", "Avaliação de déficit de vitamina D. Prescrita suplementação."),
            ("Eduardo Zimmermann", "eduardo.zim@gmail.com", "(48) 99622-1188", "Praticante de triatlo. Monitoramento cardíaco e teste ergoespirométrico."),
            ("Letícia Sampaio Macedo", "leticia.sampaio@gmail.com", "(48) 98411-9922", "Acompanhamento de ansiedade generalizada com melhora progressiva."),
            ("Vinícius Bastos Maia", "vinicius.maia@gmail.com", "(48) 99944-7766", "Controle pressórico residencial (MRPA) demonstrando bom controle."),
            ("Tatiane Gusmão Leal", "tati.leal@gmail.com", "(48) 99133-8855", "Retorno pós-operatório de apendicectomia com cicatrização completa."),
            ("Henrique Medeiros Costa", "henrique.costa@gmail.com", "(48) 98822-4433", "Avaliação de rotina preventiva e orientação para atividade física.")
        ]

        clients = []
        for name, email, contact, notes in patients_data:
            c = db.query(Client).filter(Client.user_id == user.id, Client.name == name).first()
            if not c:
                c = Client(
                    user_id=user.id,
                    name=name,
                    email=email,
                    contact=contact,
                    notes=notes,
                    category="patient",
                    is_active=True
                )
                db.add(c)
                db.flush()
            clients.append(c)

        db.commit()
        print(f"-> {len(clients)} Pacientes cadastrados.")

        # Vincular pacientes aos locais (WorkplaceClient)
        # Workplace 1 (Hospital Baía Sul): pacientes 0 a 17 (18 pacientes)
        # Workplace 2 (Santa Mônica): pacientes 10 a 25 (16 pacientes)
        # Workplace 3 (Beira-Mar): pacientes 18 a 29 e 0 a 4 (17 pacientes)
        for i, c in enumerate(clients):
            wps_to_link = []
            if i <= 17:
                wps_to_link.append(workplaces[0])
            if 10 <= i <= 25:
                wps_to_link.append(workplaces[1])
            if i >= 18 or i <= 4:
                wps_to_link.append(workplaces[2])
            
            for wp in wps_to_link:
                existing = db.query(WorkplaceClient).filter(
                    WorkplaceClient.workplace_id == wp.id,
                    WorkplaceClient.client_id == c.id
                ).first()
                if not existing:
                    db.add(WorkplaceClient(workplace_id=wp.id, client_id=c.id))

        db.commit()
        print("-> Vínculos entre pacientes e locais de atendimento estabelecidos.")

        # 4. Limpar agendamentos anteriores para garantir consistência e métricas perfeitas
        # (Isso evita dados duplicados ao rodar novamente o seed)
        existing_appts = db.query(Appointment).filter(Appointment.user_id == user.id).all()
        appt_ids = [a.id for a in existing_appts]
        if appt_ids:
            db.query(NotificationLog).filter(NotificationLog.appointment_id.in_(appt_ids)).delete(synchronize_session=False)
            db.query(Review).filter(Review.appointment_id.in_(appt_ids)).delete(synchronize_session=False)
            db.query(MedicalRecord).filter(MedicalRecord.appointment_id.in_(appt_ids)).delete(synchronize_session=False)
            db.query(Appointment).filter(Appointment.id.in_(appt_ids)).delete(synchronize_session=False)
            db.commit()
            print(f"-> {len(appt_ids)} agendamentos anteriores limpos para nova carga.")

        # 5. Gerar Histórico e Agendamentos (Maio/26 até Novembro/26)
        # Hoje é 13 de Outubro de 2026.
        today = date(2026, 10, 13)

        # Três pacientes estrelas (Top Clientes)
        p_star1 = clients[0]  # Mariana Costa Valente
        p_star2 = clients[1]  # Carlos Eduardo Fontes
        p_star3 = clients[2]  # Beatriz Mendonça Ramos

        # Faixas de horários
        morning_slots = [
            (time(8, 0), time(8, 45)),
            (time(9, 0), time(9, 50)),
            (time(10, 0), time(10, 50)),
            (time(11, 0), time(11, 45)),
        ]
        midday_slots = [
            (time(13, 30), time(14, 20)),
            (time(14, 30), time(15, 20)),
        ]
        afternoon_slots = [
            (time(15, 30), time(16, 20)),
            (time(16, 30), time(17, 20)),
            (time(17, 30), time(18, 15)),
        ]
        evening_slots = [
            (time(18, 30), time(19, 15)),
        ]

        all_slots = morning_slots * 4 + midday_slots * 2 + afternoon_slots * 3 + evening_slots

        prices = [300.0, 350.0, 350.0, 400.0, 450.0, 500.0]
        pay_methods = ['pix', 'pix', 'credit', 'credit', 'debit', 'cash']

        appointments_to_add = []

        # Gerar meses passados fechados: Maio, Junho, Julho, Agosto, Setembro de 2026
        # Cada mês com 36 a 54 atendimentos concluídos, gerando gráfico crescente
        months_config = [
            (5, 36, 12600.0),  # Maio/26
            (6, 40, 14200.0),  # Junho/26
            (7, 44, 15800.0),  # Julho/26
            (8, 48, 17400.0),  # Agosto/26
            (9, 52, 19200.0),  # Setembro/26
        ]

        for m_num, target_count, target_rev in months_config:
            # Seleciona dias úteis do mês (Seg a Sex + alguns Sáb)
            # Mês tem ~22 dias úteis, ~2 consultas por dia útil
            curr_d = date(2026, m_num, 2)
            end_d = date(2026, m_num, 28)
            count = 0
            while curr_d <= end_d and count < target_count:
                if curr_d.weekday() < 6:  # Seg a Sáb
                    # 1 a 3 consultas por dia
                    daily_appts = random.choice([1, 2, 2, 3])
                    for _ in range(daily_appts):
                        if count >= target_count:
                            break
                        
                        # Escolhe paciente (dando preferência aos top)
                        if count % 7 == 0:
                            patient = p_star1
                        elif count % 9 == 0:
                            patient = p_star2
                        elif count % 11 == 0:
                            patient = p_star3
                        else:
                            patient = random.choice(clients)

                        slot = random.choice(all_slots)
                        wp = random.choice(workplaces)
                        price = random.choice(prices)

                        appt = Appointment(
                            user_id=user.id,
                            workplace_id=wp.id,
                            client_id=patient.id,
                            date=curr_d,
                            start_time=slot[0],
                            end_time=slot[1],
                            status="completed",
                            price=price,
                            paid_value=price,
                            payment_method=random.choice(pay_methods),
                            rescheduled=False
                        )
                        appointments_to_add.append(appt)
                        count += 1
                curr_d += timedelta(days=1)

        # Mês Corrente: Outubro de 2026
        # 1. Dias anteriores (1 a 12 de Outubro): 38 concluídos, 3 cancelados cliente, 2 canc médico, 2 no-show, 4 reagendados
        oct_curr = date(2026, 10, 1)
        oct_count = 0
        while oct_curr < today:
            if oct_curr.weekday() < 6:
                # 3 a 5 consultas por dia útil
                for _ in range(random.choice([3, 4, 4, 5])):
                    patient = random.choice(clients)
                    slot = random.choice(all_slots)
                    wp = random.choice(workplaces)
                    price = random.choice(prices)

                    # Distribuição de status em outubro
                    status = "completed"
                    rescheduled = False
                    paid = price

                    if oct_count in (4, 18, 31):
                        status = "canceled_client"
                        paid = None
                    elif oct_count in (9, 27):
                        status = "canceled_user"
                        paid = None
                    elif oct_count in (13, 35):
                        status = "no_show"
                        paid = None
                    elif oct_count in (6, 15, 22, 29):
                        status = "completed"
                        rescheduled = True

                    appt = Appointment(
                        user_id=user.id,
                        workplace_id=wp.id,
                        client_id=patient.id,
                        date=oct_curr,
                        start_time=slot[0],
                        end_time=slot[1],
                        status=status,
                        price=price,
                        paid_value=paid,
                        payment_method=random.choice(pay_methods) if paid else None,
                        rescheduled=rescheduled
                    )
                    appointments_to_add.append(appt)
                    oct_count += 1
            oct_curr += timedelta(days=1)

        # 2. Hoje (13 de Outubro de 2026)
        # 2 consultas concluídas pela manhã + 2 agendadas/confirmadas à tarde
        today_appts = [
            (clients[3], time(9, 0), time(10, 0), "completed", 350.0, 350.0, workplaces[0]),
            (clients[4], time(10, 30), time(11, 25), "completed", 400.0, 400.0, workplaces[0]),
            (clients[5], time(14, 30), time(15, 30), "confirmed", 450.0, None, workplaces[1]),
            (clients[6], time(16, 0), time(17, 0), "scheduled", 350.0, None, workplaces[1]),
        ]
        for c, st, et, stt, pr, pd, wp in today_appts:
            appointments_to_add.append(Appointment(
                user_id=user.id,
                workplace_id=wp.id,
                client_id=c.id,
                date=today,
                start_time=st,
                end_time=et,
                status=stt,
                price=pr,
                paid_value=pd,
                payment_method="pix" if pd else None,
                rescheduled=False
            ))

        # 3. Dias Futuros de Outubro (14 a 31 de Outubro de 2026)
        # ~20 confirmados/agendados com preço + 6 pendentes (para a tela de Agendamentos Pendentes!)
        future_oct = today + timedelta(days=1)
        f_count = 0
        while future_oct <= date(2026, 10, 31):
            if future_oct.weekday() < 6:
                for _ in range(random.choice([1, 2, 2])):
                    patient = random.choice(clients)
                    slot = random.choice(all_slots)
                    wp = random.choice(workplaces)
                    price = random.choice(prices)

                    # 6 pendentes espalhados para alimentar os botões e badges
                    if f_count in (1, 4, 7, 10, 14, 18):
                        status = "pending"
                    elif f_count % 2 == 0:
                        status = "confirmed"
                    else:
                        status = "scheduled"

                    appointments_to_add.append(Appointment(
                        user_id=user.id,
                        workplace_id=wp.id,
                        client_id=patient.id,
                        date=future_oct,
                        start_time=slot[0],
                        end_time=slot[1],
                        status=status,
                        price=price,
                        paid_value=None,
                        payment_method=None,
                        rescheduled=False
                    ))
                    f_count += 1
            future_oct += timedelta(days=1)

        # 4. Novembro de 2026 (12 consultas para demonstrar visão de calendário futura)
        nov_d = date(2026, 11, 3)
        for i in range(12):
            patient = random.choice(clients)
            slot = random.choice(all_slots)
            wp = random.choice(workplaces)
            appointments_to_add.append(Appointment(
                user_id=user.id,
                workplace_id=wp.id,
                client_id=patient.id,
                date=nov_d,
                start_time=slot[0],
                end_time=slot[1],
                status="confirmed" if i % 2 == 0 else "scheduled",
                price=350.0,
                paid_value=None,
                rescheduled=False
            ))
            if i % 3 == 0:
                nov_d += timedelta(days=2)

        # 5. Adicionar os 3 Atendimentos Mais Longos (Recordistas de Duração)
        # 1º Lugar: Mariana Costa Valente - 120 minutos (2h de Check-up Geral e Anamnese)
        appointments_to_add.append(Appointment(
            user_id=user.id,
            workplace_id=workplaces[0].id,
            client_id=p_star1.id,
            date=date(2026, 9, 15),
            start_time=time(9, 0),
            end_time=time(11, 0),
            status="completed",
            price=650.0,
            paid_value=650.0,
            payment_method="credit",
            rescheduled=False
        ))

        # 2º Lugar: Carlos Eduardo Fontes - 105 minutos (Pequeno procedimento ambulatorial)
        appointments_to_add.append(Appointment(
            user_id=user.id,
            workplace_id=workplaces[1].id,
            client_id=p_star2.id,
            date=date(2026, 10, 6),
            start_time=time(14, 0),
            end_time=time(15, 45),
            status="completed",
            price=550.0,
            paid_value=550.0,
            payment_method="pix",
            rescheduled=False
        ))

        # 3º Lugar: Roberto de Souza Dias - 90 minutos (Avaliação detalhada com Teste de Esforço)
        appointments_to_add.append(Appointment(
            user_id=user.id,
            workplace_id=workplaces[2].id,
            client_id=clients[3].id,
            date=date(2026, 8, 20),
            start_time=time(15, 30),
            end_time=time(17, 0),
            status="completed",
            price=500.0,
            paid_value=500.0,
            payment_method="pix",
            rescheduled=False
        ))

        db.add_all(appointments_to_add)
        db.commit()
        print(f"-> {len(appointments_to_add)} Agendamentos gerados com distribuição rica.")

        # 6. Avaliações (Reviews 5 estrelas) em agendamentos concluídos
        completed_appts = db.query(Appointment).filter(
            Appointment.user_id == user.id,
            Appointment.status == "completed"
        ).order_by(Appointment.date.desc()).limit(15).all()

        reviews_feedback = [
            (5, "Atendimento impecável! O Dr. Mateus é extremamente atencioso, explicou cada detalhe com muita clareza."),
            (5, "Consultório excelente, pontualidade britânica e um acolhimento diferenciado. Recomendo muito!"),
            (5, "Melhor médico que já me atendeu em Florianópolis. Diagnóstico certeiro e tratamento humanizado."),
            (5, "O sistema de lembrete pelo WhatsApp e a confirmação rápida facilitam demais a nossa rotina."),
            (5, "Excelente profissional! Passa muita segurança e cuidado com o paciente."),
            (4, "Ótimo atendimento e ambiente super agradável. Profissional muito competente."),
            (5, "Muito pontual, explicou os exames com calma e tirou todas as minhas dúvidas."),
            (5, "Experiência de primeiro mundo. Da recepção ao atendimento clínico, tudo nota 10!"),
            (5, "Dr. Mateus transmite muita confiança. Já indiquei para toda a minha família."),
            (5, "Instalações modernas e atendimento médico de excelência.")
        ]

        for i, appt in enumerate(completed_appts[:len(reviews_feedback)]):
            rating, comment = reviews_feedback[i]
            rev = Review(
                appointment_id=appt.id,
                rating=rating,
                comment=comment
            )
            db.add(rev)

        db.commit()
        print(f"-> {len(reviews_feedback)} Avaliações com elogios cadastrados.")

        # 7. Prontuários Médicos Criptografados (Anamneses e Evoluções)
        records_data = [
            (
                p_star1.id,
                "anamnesis",
                "PACIENTE: Mariana Costa Valente\n"
                "QUEIXA PRINCIPAL: Cefaleia pulsátil frequente há 3 meses.\n"
                "HISTÓRIA DA DOENÇA ATUAL: Paciente relata episódios de cefaleia holocraniana de caráter pulsátil, "
                "acompanhada de náuseas e fotofobia. Piora aos finais de semana e sob estresse profissional.\n"
                "ANTECEDENTES: Sem comorbidades prévias. Nega alergias medicamentosas.\n"
                "CONDUTA: Prescrito Topiramato profilático e orientado diário da dor. Retorno em 60 dias."
            ),
            (
                p_star1.id,
                "evolution",
                "PACIENTE: Mariana Costa Valente\n"
                "EVOLUÇÃO CLÍNICA: Paciente em retorno, referindo redução de 80% na frequência das crises de cefaleia. "
                "Excelente tolerabilidade à medicação. Sem efeitos adversos relatados.\n"
                "EXAME FÍSICO: PA 118x76 mmHg, FC 68 bpm. Sem sinais focais.\n"
                "CONDUTA: Mantida terapêutica atual. Agendado acompanhamento semestral."
            ),
            (
                p_star2.id,
                "anamnesis",
                "PACIENTE: Carlos Eduardo Fontes\n"
                "QUEIXA PRINCIPAL: Check-up clínico anual e controle de hipertensão.\n"
                "HISTÓRIA ATUAL: Hipertenso há 4 anos em uso de Losartana 50mg. Nega precordialgia ou dispneia.\n"
                "EXAME FÍSICO: PA 126x82 mmHg, Murmúrio vesicular presente bilateral sem ruídos adventícios.\n"
                "CONDUTA: Solicitado MAPA 24h, ECG e perfil lipídico completo."
            ),
            (
                p_star2.id,
                "evolution",
                "PACIENTE: Carlos Eduardo Fontes\n"
                "EVOLUÇÃO CLÍNICA: Traz resultados de exames. MAPA dentro dos limites da normalidade (controle pressórico adequado). "
                "Colesterol LDL 88 mg/dL, Glicemia 92 mg/dL.\n"
                "CONDUTA: Mantida Losartana 50mg 1x/dia. Liberado para atividade física aeróbica regular."
            ),
            (
                p_star3.id,
                "anamnesis",
                "PACIENTE: Beatriz Mendonça Ramos\n"
                "QUEIXA: Avaliação para prática esportiva (meia-maratona).\n"
                "HISTÓRIA: Corredora recreativa há 3 anos. Nega síncope, dor torácica ou palpitações.\n"
                "EXAME FÍSICO: PA 110x70 mmHg, FC basal 58 bpm. Ausculta cardíaca em 2T sem sopros.\n"
                "CONDUTA: Realizado ECG (ritmo sinusal com bradicardia fisiológica do atleta). Emitido atestado médico para competição."
            )
        ]

        for client_id, r_type, content in records_data:
            rec = MedicalRecord(
                client_id=client_id,
                type=r_type,
                content=encrypt_data(content).decode()
            )
            db.add(rec)

        db.commit()
        print(f"-> {len(records_data)} Prontuários criptografados gerados com sucesso.")

        # 8. Histórico de Metas Concluídas (GoalHistory)
        # Limpar histórico anterior de metas
        db.query(GoalHistory).filter(GoalHistory.user_id == user.id).delete()
        goals_data = [
            ("Mai/26", 12000.0, 12600.0, True),
            ("Jun/26", 14000.0, 14200.0, True),
            ("Jul/26", 15000.0, 15800.0, True),
            ("Ago/26", 17000.0, 17400.0, True),
            ("Set/26", 19000.0, 19200.0, True),
        ]
        for m_ref, g_val, rev_close, ach in goals_data:
            gh = GoalHistory(
                user_id=user.id,
                goal_value=g_val,
                revenue_at_close=rev_close,
                achieved=ach,
                month_ref=m_ref
            )
            db.add(gh)

        db.commit()
        print("-> Histórico de metas dos últimos 5 meses adicionado.")

        # 9. Notificações Recentes no Centro de Notificações
        # 3 não lidas (badge '3' no sino) + 3 lidas
        recent_upcoming = db.query(Appointment).filter(
            Appointment.user_id == user.id,
            Appointment.date >= today
        ).order_by(Appointment.date.asc()).limit(6).all()

        notif_types = ['1day', '30min', '2days', '1day', '30min', '2days']
        for i, appt in enumerate(recent_upcoming):
            notif = NotificationLog(
                appointment_id=appt.id,
                notification_type=notif_types[i],
                is_read=(i >= 3),  # Primeiras 3 não lidas
                sent_at=datetime.now() - timedelta(hours=i * 2 + 1)
            )
            db.add(notif)

        db.commit()
        print("-> Notificações ativas inseridas (com 3 não lidas para exibir o badge).")

        print("\n=======================================================")
        print(" SUCESSO TOTAL: Base de demonstração populada com êxito!")
        print("=======================================================")
        print(f"Profissional: {user.name} | CRM: {user.crm}")
        print(f"Meta Mensal: R$ {user.monthly_goal:,.2f}")
        print(f"Locais de Atendimento: {len(workplaces)}")
        print(f"Total de Pacientes: {len(clients)}")
        print(f"Total de Agendamentos: {len(appointments_to_add)}")
        print(f"Avaliações 5 estrelas: {len(reviews_feedback)}")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"\n[ERRO AO POPULAR BANCO]: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
