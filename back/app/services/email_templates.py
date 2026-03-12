"""Templates HTML para emails do MindFlow.

Cada função retorna o HTML completo pronto para envio.
Preparado para expansão futura (password_reset, two_factor_code, etc.)
"""

def appointment_package_html(
    client_name: str,
    professional_name: str,
    count: int,
    start_date: str,
    end_date: str,
    workplace_name: str,
) -> str:
    """Gera HTML para comunicar múltiplos agendamentos (recorrência)."""
    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    ✨ Schedly
                </h1>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                    Pacote de Agendamentos
                </p>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-radius: 0 0 16px 16px;">
                <p style="margin: 0 0 24px; font-size: 16px; color: #111827; line-height: 1.7;">
                    Olá, <strong>{client_name}</strong>.
                </p>
                
                <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                    Foram marcados <strong>{count} atendimentos</strong> com o(a) profissional <strong>{professional_name}</strong>, iniciando no dia <strong>{start_date}</strong> e indo até o dia <strong>{end_date}</strong>.
                </p>

                <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 0 0 12px; color: #6b7280; font-size: 14px; width: 40%;"><strong>Local de atendimento:</strong></td>
                            <td style="padding: 0 0 12px; color: #111827; font-size: 15px; font-weight: 600;">{workplace_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0; color: #6b7280; font-size: 14px;"><strong>Atendimentos agendados:</strong></td>
                            <td style="padding: 0; color: #111827; font-size: 15px; font-weight: 600;">{count}</td>
                        </tr>
                    </table>
                </div>

                <p style="margin: 0 0 16px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                    <strong>Importante:</strong> Você receberá e-mails adicionais de lembrete próximo às datas de cada atendimento.
                </p>
                
                <p style="margin: 32px 0 0; border-top: 1px solid #e5e7eb; padding-top: 24px; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    Se precisar alterar algo, por favor, entre em contato diretamente com o profissional.
                </p>
            </div>
            
            <div style="text-align: center; padding-top: 24px;">
                <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                    Mensagem automática. Por favor, não responda este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """



def appointment_reminder(
    user_name: str,
    client_name: str,
    time: str,
    date: str,
    workplace_name: str,
) -> str:
    """Gera HTML para lembrete individual de agendamento."""

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    ✨ MindFlow
                </h1>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                    Lembrete de Agendamento
                </p>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0 0 24px; font-size: 16px; color: #111827; line-height: 1.7;">
                    Olá, <strong>{user_name}</strong>, não se esqueça que você tem um agendamento com
                    <strong>{client_name}</strong> às <strong>{time}</strong> do dia
                    <strong>{date}</strong> no local <strong>{workplace_name}</strong>.
                </p>

                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%); border-radius: 12px; padding: 20px; border: 1px solid #c7d2fe;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 100px;">📅 Data</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">🕐 Horário</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">👤 Cliente</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{client_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">📍 Local</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{workplace_name}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Este email foi enviado automaticamente pelo MindFlow.<br>
                    Por favor, não responda a este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def password_reset_code(user_name: str, code: str) -> str:
    """Gera HTML para email de recuperação de senha com código."""

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    ✨ MindFlow
                </h1>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                    Recuperação de Senha
                </p>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">
                    Olá, <strong>{user_name}</strong>! 👋
                </p>
                <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    Recebemos uma solicitação para redefinir a senha da sua conta.
                    Use o código abaixo para continuar:
                </p>

                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%); border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #c7d2fe;">
                    <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                        Seu código de verificação
                    </p>
                    <p style="margin: 0; font-size: 36px; font-weight: 800; color: #6366f1; letter-spacing: 8px; font-family: monospace;">
                        {code}
                    </p>
                </div>

                <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                    ⏳ Este código expira em <strong>15 minutos</strong>.<br>
                    Se você não solicitou esta alteração, ignore este email.
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Este email foi enviado automaticamente pelo MindFlow.<br>
                    Por favor, não responda a este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def two_factor_code_html(user_name: str, code: str, action: str = "login") -> str:
    """Gera HTML para email de código 2FA."""
    
    action_text = "seu login" if action == "login" else f"a {action} da verificação em duas etapas"
    
    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    🔐 Verificação em Duas Etapas
                </h1>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0 0 24px; font-size: 16px; color: #111827; line-height: 1.7;">
                    Olá, <strong>{user_name}</strong>!<br>
                    Use o código abaixo para confirmar <strong>{action_text}</strong>.
                </p>

                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%); border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #c7d2fe; margin-bottom: 24px;">
                    <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                        Seu código de acesso
                    </p>
                    <p style="margin: 0; font-size: 36px; font-weight: 800; color: #6366f1; letter-spacing: 8px; font-family: monospace;">
                        {code}
                    </p>
                </div>

                <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563; text-align: center;">
                    ⏳ Este código expira em <strong>10 minutos</strong>.<br>
                    Se você não solicitou esta ação, considere alterar sua senha por segurança.
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Este email foi enviado automaticamente pelo Velo.<br>
                    Por favor, não responda a este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def appointment_confirmation_request_html(
    client_name: str,
    professional_name: str,
    time: str,
    date: str,
    workplace_name: str,
    confirm_url: str,
    cancel_url: str,
    price: str = None,
) -> str:
    """Gera HTML para solicitar confirmação de agendamento ao cliente."""

    price_row = ""
    if price:
        price_row = f"""
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">💰 Valor Estimado</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{price}</td>
                        </tr>
        """

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    📅 Confirmação de Agendamento
                </h1>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0 0 24px; font-size: 16px; color: #111827; line-height: 1.7;">
                    Olá, <strong>{client_name}</strong>! 
                    Seu agendamento com <strong>{professional_name}</strong> foi recebido.
                </p>

                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 20px; border: 1px solid #bbf7d0; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 100px;">📅 Data</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">🕐 Horário</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">📍 Local</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{workplace_name}</td>
                        </tr>
                        {price_row}
                    </table>
                </div>

                <p style="margin: 0 0 16px; font-size: 15px; color: #4b5563; text-align: center;">
                    Por favor, confirme se você comparecerá clicando em um dos botões abaixo:
                </p>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="{confirm_url}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px; font-size: 15px;">
                        ✅ Confirmar Presença
                    </a>
                    <a href="{cancel_url}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        ❌ Cancelar Agendamento
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Este email foi enviado automaticamente pelo MindFlow.<br>
                    Por favor, não responda a este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def appointment_rescheduled_request_html(
    client_name: str,
    professional_name: str,
    old_time: str,
    old_date: str,
    new_time: str,
    new_date: str,
    workplace_name: str,
    confirm_url: str,
    cancel_url: str,
    price: str = None,
) -> str:
    """Gera HTML para alertar sobre reagendamento e solicitar confirmação."""

    price_row = ""
    if price:
        price_row = f"""
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">💰 Valor Estimado</td>
                            <td style="padding: 6px 0; font-size: 15px; color: #111827; font-weight: 700;">{price}</td>
                        </tr>
        """

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    ⚠️ Agendamento Remarcado
                </h1>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0 0 24px; font-size: 16px; color: #111827; line-height: 1.7;">
                    Olá, <strong>{client_name}</strong>. O seu agendamento com <strong>{professional_name}</strong> 
                    foi remarcado. Veja os detalhes abaixo:
                </p>

                <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; border: 1px solid #fde68a; margin-bottom: 24px;">
                    <p style="margin: 0 0 12px; font-size: 14px; color: #b45309; text-decoration: line-through;">
                        <strong>Data antiga:</strong> {old_date} às {old_time}
                    </p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 100px;">📅 Nova Data</td>
                            <td style="padding: 6px 0; font-size: 15px; color: #111827; font-weight: 700;">{new_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">🕐 Novo Horário</td>
                            <td style="padding: 6px 0; font-size: 15px; color: #111827; font-weight: 700;">{new_time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">📍 Local</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{workplace_name}</td>
                        </tr>
                        {price_row}
                    </table>
                </div>

                <p style="margin: 0 0 16px; font-size: 15px; color: #4b5563; text-align: center;">
                    Para manter sua reserva, confirme clicando no botão abaixo:
                </p>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="{confirm_url}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px; font-size: 15px;">
                        ✅ Confirmar Novo Horário
                    </a>
                    <a href="{cancel_url}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        ❌ Cancelar Agendamento
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Este email foi enviado automaticamente pelo MindFlow.<br>
                    Por favor, não responda a este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def appointment_price_changed_html(
    client_name: str,
    professional_name: str,
    time: str,
    date: str,
    workplace_name: str,
    old_price: str,
    new_price: str,
    confirm_url: str,
    cancel_url: str,
) -> str:
    """Gera HTML para alertar sobre mudança de preço e solicitar nova confirmação."""

    old_price_text = old_price if old_price else "Não informado"
    new_price_text = new_price if new_price else "Não informado"

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    💰 Atualização de Valor
                </h1>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0 0 24px; font-size: 16px; color: #111827; line-height: 1.7;">
                    Olá, <strong>{client_name}</strong>. O valor estimado do seu agendamento com 
                    <strong>{professional_name}</strong> foi atualizado. Por favor, confirme novamente.
                </p>

                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%); border-radius: 12px; padding: 20px; border: 1px solid #c7d2fe; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 120px;">📅 Data</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">🕐 Horário</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">📍 Local</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{workplace_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">💰 Valor Anterior</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #ef4444; font-weight: 600; text-decoration: line-through;">{old_price_text}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">💰 Novo Valor</td>
                            <td style="padding: 6px 0; font-size: 16px; color: #10b981; font-weight: 700;">{new_price_text}</td>
                        </tr>
                    </table>
                </div>

                <p style="margin: 0 0 16px; font-size: 15px; color: #4b5563; text-align: center;">
                    Como o valor foi alterado, precisamos de uma nova confirmação. Links anteriores foram desativados.
                </p>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="{confirm_url}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px; font-size: 15px;">
                        ✅ Confirmar Agendamento
                    </a>
                    <a href="{cancel_url}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        ❌ Cancelar Agendamento
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Este email foi enviado automaticamente pelo MindFlow.<br>
                    Por favor, não responda a este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def appointment_completed_html(
    client_name: str,
    professional_name: str,
    time: str,
    date: str,
    workplace_name: str,
    paid_value: str,
    payment_method: str,
    review_url: str,
) -> str:
    """Gera HTML para recibo de conclusão de agendamento e pedido de avaliação."""

    payment_method_map = {
        "pix": "PIX",
        "credit": "Cartão de Crédito",
        "debit": "Cartão de Débito",
        "boleto": "Boleto",
        "cash": "Dinheiro",
        "free": "Gratuito",
    }
    method_display = payment_method_map.get(payment_method, payment_method)

    paid_value_text = paid_value if paid_value else "Não informado"
    if payment_method == "free":
        paid_value_text = "Gratuito"

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                    ✅ Atendimento Concluído
                </h1>
            </div>

            <!-- Body -->
            <div style="background-color: white; padding: 32px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <p style="margin: 0 0 24px; font-size: 16px; color: #111827; line-height: 1.7;">
                    Olá, <strong>{client_name}</strong>. O seu atendimento com 
                    <strong>{professional_name}</strong> foi finalizado com sucesso!
                </p>

                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%); border-radius: 12px; padding: 20px; border: 1px solid #c7d2fe; margin-bottom: 24px;">
                    <h2 style="margin: 0 0 12px; font-size: 16px; color: #4338ca;">Recibo de Atendimento</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 120px;">📅 Data</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">🕐 Horário</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">📍 Local</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{workplace_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">💳 Método de Pagamento</td>
                            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{method_display}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">💰 Valor Pago</td>
                            <td style="padding: 6px 0; font-size: 16px; color: #6366f1; font-weight: 700;">{paid_value_text}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 12px; font-size: 18px; color: #111827;">Como foi o seu atendimento?</h3>
                    <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">
                        Sua opinião é muito importante! Avalie o serviço prestado por <strong>{professional_name}</strong>.
                    </p>
                    <a href="{review_url}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        ⭐ Avaliar Atendimento
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Este email foi enviado automaticamente pelo Velo.<br>
                    Por favor, não responda a este email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
