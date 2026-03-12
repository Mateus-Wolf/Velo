export const formatCurrencyInput = (value) => {
    if (value === undefined || value === null) return '';
    let valStr = value.toString();
    valStr = valStr.replace(/\D/g, ''); // Remove all non-digits
    if (valStr === '') return '';

    const amount = (parseInt(valStr, 10) / 100).toFixed(2);
    return Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parseCurrencyInput = (value) => {
    if (!value) return null;
    let valStr = value.toString();
    valStr = valStr.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(valStr);
    return isNaN(parsed) ? null : parsed;
};
