import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineX,
    HiOutlineOfficeBuilding,
    HiOutlineLocationMarker,
    HiOutlineClock,
    HiOutlineDocumentText,
    HiOutlinePhotograph,
    HiOutlineUpload,
} from 'react-icons/hi';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const DAYS = [
    { value: '1', label: 'Seg' },
    { value: '2', label: 'Ter' },
    { value: '3', label: 'Qua' },
    { value: '4', label: 'Qui' },
    { value: '5', label: 'Sex' },
    { value: '6', label: 'Sáb' },
    { value: '0', label: 'Dom' },
];

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 28 },
    },
    exit: {
        opacity: 0,
        y: 40,
        scale: 0.96,
        transition: { duration: 0.2 },
    },
};

export default function WorkplaceModal({ isOpen, onClose, onCreated, onUpdated, workplace }) {
    const { t } = useTranslation();
    const isEditing = !!workplace;
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '',
        description: '',
        address: '',
        cep: '',
        number: '',
        work_days: [],
        start_time: '08:00',
        end_time: '18:00',
        break_end_time: '',
        buffer_time: 0,
        is_active: true,
        works_on_holidays: false,
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasBreak, setHasBreak] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (workplace) {
            setForm({
                name: workplace.name || '',
                description: workplace.description || '',
                address: workplace.address || '',
                cep: workplace.cep || '',
                number: workplace.number || '',
                work_days: workplace.work_days ? workplace.work_days.split(',').map((d) => d.trim()) : [],
                start_time: workplace.start_time ? workplace.start_time.substring(0, 5) : '08:00',
                end_time: workplace.end_time ? workplace.end_time.substring(0, 5) : '18:00',
                break_start_time: workplace.break_start_time ? workplace.break_start_time.substring(0, 5) : '',
                break_end_time: workplace.break_end_time ? workplace.break_end_time.substring(0, 5) : '',
                buffer_time: workplace.buffer_time ?? 0,
                is_active: workplace.is_active !== false,
                works_on_holidays: !!workplace.works_on_holidays,
            });
            setImagePreview(workplace.photo_url || null);
            setImageFile(null);
            setHasBreak(!!(workplace.break_start_time || workplace.break_end_time));
        } else {
            setForm({
                name: '',
                description: '',
                address: '',
                cep: '',
                number: '',
                work_days: [],
                start_time: '08:00',
                end_time: '18:00',
                break_start_time: '',
                break_end_time: '',
                buffer_time: 0,
                is_active: true,
                works_on_holidays: false,
            });
            setImageFile(null);
            setImagePreview(null);
            setHasBreak(false);
        }
        setError('');
    }, [workplace, isOpen]);

    const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const toggleDay = (day) => {
        setForm((f) => ({
            ...f,
            work_days: f.work_days.includes(day)
                ? f.work_days.filter((d) => d !== day)
                : [...f.work_days, day],
        }));
    };

    const WEEKDAYS = ['1', '2', '3', '4', '5'];
    const WEEKEND = ['6', '0'];

    const toggleGroup = (group) => {
        setForm((f) => {
            const allSelected = group.every((d) => f.work_days.includes(d));
            const without = f.work_days.filter((d) => !group.includes(d));
            return { ...f, work_days: allSelected ? without : [...new Set([...without, ...group])] };
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCepChange = async (val) => {
        const rawCep = val.replace(/\D/g, '');
        let formattedCep = rawCep;
        if (rawCep.length > 5) {
            formattedCep = `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}`;
        }
        update('cep', formattedCep);

        if (rawCep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    const newAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    update('address', newAddress);
                }
            } catch (err) {
                console.error("Erro ao buscar CEP:", err);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim()) {
            setError(t('workplaces.modal.errorName', 'O nome do local é obrigatório.'));
            return;
        }
        if (form.work_days.length === 0) {
            setError(t('workplaces.modal.errorDays', 'Selecione ao menos um dia de funcionamento.'));
            return;
        }

        setLoading(true);
        try {
            // For now we store image as a data URL (base64). In production, you'd upload to a storage service.
            let photoUrl = isEditing ? workplace.photo_url : null;
            if (imageFile) {
                photoUrl = imagePreview; // base64 data URL
            } else if (!imagePreview) {
                photoUrl = null;
            }

            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                address: form.address.trim() || null,
                cep: form.cep?.trim() || null,
                number: form.number?.trim() || null,
                photo_url: photoUrl,
                work_days: form.work_days.sort().join(','),
                start_time: form.start_time,
                end_time: form.end_time,
                break_start_time: hasBreak ? (form.break_start_time || null) : null,
                break_end_time: hasBreak ? (form.break_end_time || null) : null,
                buffer_time: parseInt(form.buffer_time, 10),
                works_on_holidays: form.works_on_holidays,
            };

            if (isEditing) {
                payload.is_active = form.is_active;
                const { data } = await api.put(`/workplaces/${workplace.id}`, payload);
                onUpdated?.(data);
            } else {
                const { data } = await api.post('/workplaces/', payload);
                onCreated?.(data);
            }

            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || t('workplaces.modal.errorSave', 'Erro ao salvar local de trabalho.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                >
                    {/* Backdrop */}
                    <motion.div
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal */}
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl shadow-brand-950/50"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-surface-950/80 backdrop-blur-xl px-6 py-4 rounded-t-3xl">
                            <h2 className="text-lg font-semibold text-gradient">
                                {isEditing ? t('workplaces.modal.editTitle', 'Editar Local de Trabalho') : t('workplaces.modal.createTitle', 'Novo Local de Trabalho')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Name */}
                            <InputField
                                icon={HiOutlineOfficeBuilding}
                                label={t('workplaces.modal.name', 'Nome do local *')}
                                value={form.name}
                                onChange={(v) => update('name', v)}
                            />

                            {/* Description */}
                            <InputField
                                icon={HiOutlineDocumentText}
                                label={t('workplaces.modal.description', 'Descrição')}
                                value={form.description}
                                onChange={(v) => update('description', v)}
                            />

                            {/* CEP and Number */}
                            <div className="grid grid-cols-2 gap-4">
                                <InputField
                                    icon={HiOutlineLocationMarker}
                                    label={t('workplaces.modal.cep', 'CEP')}
                                    value={form.cep}
                                    onChange={handleCepChange}
                                    maxLength={9}
                                />
                                <InputField
                                    icon={HiOutlineLocationMarker}
                                    label={t('workplaces.modal.number', 'Número')}
                                    value={form.number}
                                    onChange={(v) => update('number', v)}
                                />
                            </div>

                            {/* Address */}
                            <InputField
                                icon={HiOutlineLocationMarker}
                                label={t('workplaces.modal.address', 'Endereço (Auto-preenchido)')}
                                value={form.address}
                                onChange={(v) => update('address', v)}
                            />

                            {/* Image Upload */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlinePhotograph size={16} className="text-surface-200/40" />
                                    {t('workplaces.modal.image', 'Imagem do local')}
                                </label>

                                {imagePreview ? (
                                    <div className="relative rounded-xl overflow-hidden border border-white/10">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-40 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-red-500/80 transition-colors"
                                        >
                                            <HiOutlineX size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] py-8 text-surface-200/40 hover:border-brand-500/30 hover:text-brand-400 hover:bg-white/[0.04] transition-all cursor-pointer"
                                    >
                                        <HiOutlineUpload size={24} />
                                        <span className="text-sm">{t('workplaces.modal.upload', 'Clique para enviar uma imagem')}</span>
                                        <span className="text-xs text-surface-200/30">{t('workplaces.modal.uploadDesc', 'PNG, JPG, WEBP até 5MB')}</span>
                                    </motion.button>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Work Days */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="block text-sm font-medium text-surface-200/70">
                                        {t('workplaces.modal.workDays', 'Dias de funcionamento *')}
                                    </label>
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(WEEKDAYS)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${WEEKDAYS.every((d) => form.work_days.includes(d))
                                                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                                                : 'bg-white/5 text-surface-200/50 border border-white/10 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {t('workplaces.modal.weekdays', 'Dias Úteis')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(WEEKEND)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${WEEKEND.every((d) => form.work_days.includes(d))
                                                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                                                : 'bg-white/5 text-surface-200/50 border border-white/10 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {t('workplaces.modal.weekend', 'Fim de Sem.')}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS.map((day) => {
                                        const selected = form.work_days.includes(day.value);
                                        return (
                                            <motion.button
                                                key={day.value}
                                                type="button"
                                                whileTap={{ scale: 0.92 }}
                                                onClick={() => toggleDay(day.value)}
                                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${selected
                                                    ? 'gradient-brand text-white shadow-lg shadow-brand-600/25'
                                                    : 'bg-white/5 text-surface-200/60 border border-white/10 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {t(`calendar.daysShort.${day.value}`, day.label)}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Time range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                        <HiOutlineClock size={16} /> {t('workplaces.modal.startTime', 'Início (Expediente)')}
                                    </label>
                                    <input
                                        type="time"
                                        value={form.start_time}
                                        onChange={(e) => update('start_time', e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                        <HiOutlineClock size={16} /> {t('workplaces.modal.endTime', 'Fim (Expediente)')}
                                    </label>
                                    <input
                                        type="time"
                                        value={form.end_time}
                                        onChange={(e) => update('end_time', e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>
                            </div>

                            {/* Break Time Toggle */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-surface-200">{t('workplaces.modal.addBreak', 'Adicionar Intervalo')}</p>
                                        <p className="text-xs text-surface-200/50 mt-0.5">
                                            {t('workplaces.modal.breakDesc', 'Definir pausa ou almoço no expediente')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHasBreak(!hasBreak)}
                                        className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${hasBreak ? 'bg-brand-500' : 'bg-surface-700'
                                            }`}
                                    >
                                        <motion.div
                                            layout
                                            className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md"
                                            style={{ left: hasBreak ? 'calc(100% - 1.625rem)' : '0.125rem' }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Break Time range */}
                            <AnimatePresence>
                                {hasBreak && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="grid grid-cols-2 gap-4 overflow-hidden"
                                    >
                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                                <HiOutlineClock size={16} /> {t('workplaces.modal.breakStart', 'Início do Intervalo')}
                                            </label>
                                            <input
                                                type="time"
                                                value={form.break_start_time}
                                                onChange={(e) => update('break_start_time', e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                                <HiOutlineClock size={16} /> {t('workplaces.modal.breakEnd', 'Fim do Intervalo')}
                                            </label>
                                            <input
                                                type="time"
                                                value={form.break_end_time}
                                                onChange={(e) => update('break_end_time', e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Works on Holidays toggle */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-surface-200">{t('workplaces.modal.holidays', 'Trabalha em feriados')}</p>
            <p className="text-xs text-surface-200/50 mt-0.5">
                {t('workplaces.modal.holidaysDesc', 'Permitir agendamentos em dias de feriado')}
            </p>
        </div>
        <button
            type="button"
            onClick={() => update('works_on_holidays', !form.works_on_holidays)}
            className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${form.works_on_holidays ? 'bg-brand-500' : 'bg-surface-700'
                }`}
        >
            <motion.div
                layout
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md"
                style={{ left: form.works_on_holidays ? 'calc(100% - 1.625rem)' : '0.125rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </button>
    </div>
</div>

                            {/* Buffer Time */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-surface-200">Intervalo entre consultas</p>
                                        <p className="text-xs text-surface-200/50 mt-0.5">Tempo de preparo ou deslocamento a partir deste local</p>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={form.buffer_time}
                                            onChange={(e) => update('buffer_time', e.target.value)}
                                            className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2 pl-4 pr-10 text-sm font-medium text-surface-50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 hover:bg-white/10 transition-colors"
                                        >
                                            <option value={0} className="bg-surface-900 text-surface-50">Nenhum</option>
                                            <option value={5} className="bg-surface-900 text-surface-50">5 min</option>
                                            <option value={10} className="bg-surface-900 text-surface-50">10 min</option>
                                            <option value={15} className="bg-surface-900 text-surface-50">15 min</option>
                                            <option value={20} className="bg-surface-900 text-surface-50">20 min</option>
                                            <option value={30} className="bg-surface-900 text-surface-50">30 min</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-surface-200/50">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Inactivate toggle — edit only */}
                            {isEditing && (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-amber-300">{t('workplaces.modal.status', 'Status do local')}</p>
                                            <p className="text-xs text-surface-200/50 mt-0.5">
                                                {form.is_active ? t('workplaces.modal.active', 'Ativo — visível na agenda') : t('workplaces.modal.inactive', 'Inativo — oculto da agenda')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => update('is_active', !form.is_active)}
                                            className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${form.is_active ? 'bg-emerald-500' : 'bg-surface-700'
                                                }`}
                                        >
                                            <motion.div
                                                layout
                                                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md"
                                                style={{ left: form.is_active ? 'calc(100% - 1.625rem)' : '0.125rem' }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-shadow hover:shadow-brand-600/40 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : isEditing ? (
                                    t('workplaces.modal.save', 'Salvar alterações')
                                ) : (
                                    t('workplaces.modal.create', 'Criar local de trabalho')
                                )}
                            </motion.button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Simple input field                                                 */
/* ------------------------------------------------------------------ */
function InputField({ icon: Icon, label, value, onChange, type = 'text', ...rest }) {
    return (
        <div className="relative group">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                <Icon size={16} className="text-surface-200/40 group-focus-within:text-brand-400 transition-colors" />
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all duration-300 focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30"
                placeholder={label.replace(' *', '')}
                {...rest}
            />
        </div>
    );
}
