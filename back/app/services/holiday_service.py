import logging
import httpx
from datetime import date, datetime
from typing import List, Set

logger = logging.getLogger("mindflow.holiday_service")

# Cache em memória para armazenar os feriados por ano
# Formato: { year: { date_obj_1, date_obj_2, ... } }
_holidays_cache: dict[int, Set[date]] = {}

def get_brazilian_holidays(year: int) -> Set[date]:
    """
    Busca os feriados nacionais de um ano específico na Brasil API.
    Retorna do cache se já tiver sido buscado.
    """
    if year in _holidays_cache:
        return _holidays_cache[year]

    url = f"https://brasilapi.com.br/api/feriados/v1/{year}"
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        data = response.json()
        
        holidays_dates = set()
        for item in data:
            # Formato da data na API: "YYYY-MM-DD"
            date_str = item.get("date")
            if date_str:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                holidays_dates.add(parsed_date)
        
        # Salva no cache
        _holidays_cache[year] = holidays_dates
        logger.info(f"Feriados de {year} buscados e armazenados em cache: {len(holidays_dates)} dias.")
        return holidays_dates

    except Exception as e:
        logger.error(f"Erro ao buscar feriados de {year} na Brasil API: {e}")
        # Em caso de falha, retorna um set vazio (ou os valores antigos se houvessem) para não quebrar a aplicação.
        return set()

def is_holiday(check_date: date) -> bool:
    """
    Verifica se uma determinada data é feriado consultando o cache (ou a API se não estiver lá).
    """
    holidays_of_year = get_brazilian_holidays(check_date.year)
    return check_date in holidays_of_year

def prefetch_current_year_holidays():
    """
    Busca os feriados proativamente (usado para aquecer o cache via background scheduler).
    """
    current_year = datetime.now().year
    logger.info(f"Pré-buscando feriados do ano {current_year}...")
    get_brazilian_holidays(current_year)
