import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function AppointmentCreationSummary({ result, onClose }) {
    const dialog = useRef(null);
    const { t, i18n } = useTranslation();
    useEffect(() => {
        if (result) dialog.current?.showModal();
        else dialog.current?.close();
    }, [result]);
    const formatDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString(i18n.language);
    return (
        <dialog ref={dialog} onCancel={onClose} onClose={onClose}
            aria-labelledby="creation-summary-title"
            className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-surface-900 p-6 text-surface-50 backdrop:bg-black/60">
            {result && <>
                <h2 id="creation-summary-title" className="text-lg font-semibold">{t('calendar.creationSummary.title')}</h2>
                <p className="mt-3">{t('calendar.creationSummary.counts', { created: result.appointments.length, skipped: result.skipped.length })}</p>
                <h3 className="mt-5 font-medium">{t('calendar.creationSummary.created')}</h3>
                <ul className="mt-2 space-y-1">
                    {result.appointments.map((item) => <li key={item.id}>{formatDate(item.date)} — {item.start_time.slice(0, 5)}</li>)}
                </ul>
                {result.skipped.length > 0 && <>
                    <h3 className="mt-5 font-medium text-amber-300">{t('calendar.creationSummary.skipped')}</h3>
                    <ul className="mt-2 space-y-2">
                        {result.skipped.map((item) => <li key={item.date}>{formatDate(item.date)} — {item.reason}</li>)}
                    </ul>
                </>}
                <button autoFocus type="button" onClick={onClose} className="mt-6 rounded-xl bg-brand-500 px-5 py-2 font-medium">
                    {t('calendar.creationSummary.close')}
                </button>
            </>}
        </dialog>
    );
}
