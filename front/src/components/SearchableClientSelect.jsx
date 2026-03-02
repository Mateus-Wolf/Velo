import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HiOutlineChevronDown, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function SearchableClientSelect({
    value,
    onChange,
    clients,
    disabled,
    placeholder,
    emptyMessage
}) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const selectedClient = useMemo(() => clients.find(c => String(c.id) === String(value)), [clients, value]);

    const filteredClients = useMemo(() => {
        if (!search) return clients;
        const lowerSearch = search.toLowerCase();
        return clients.filter(c => c.name.toLowerCase().includes(lowerSearch));
    }, [clients, search]);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focar no input ao abrir
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else {
            setSearch('');
        }
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div
                className={`w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-500/50 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20'
                    }`}
                onClick={() => {
                    if (!disabled) setIsOpen(!isOpen);
                }}
            >
                {isOpen ? (
                    <div className="flex items-center gap-2 w-full">
                        <HiOutlineSearch className="text-surface-200/50 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('searchableSelect.search', 'Buscar cliente...')}
                            className="bg-transparent border-none outline-none w-full text-surface-50 p-0 placeholder-surface-200/50"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <span className={selectedClient ? "text-surface-50 truncate" : "text-surface-200/50"}>
                        {selectedClient ? selectedClient.name : (placeholder || t('searchableSelect.placeholder', 'Selecione o cliente'))}
                    </span>
                )}

                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {value && !isOpen && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="p-1 -m-1 text-surface-200/50 hover:text-white transition-colors"
                        >
                            <HiOutlineX size={14} />
                        </button>
                    )}
                    <HiOutlineChevronDown className={`text-surface-200/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && !disabled && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[60] w-full mt-2 rounded-xl border border-white/10 bg-surface-950 shadow-2xl overflow-hidden max-h-60 flex flex-col"
                    >
                        <ul className="overflow-y-auto custom-scrollbar py-2 flex-1">
                            {filteredClients.length === 0 ? (
                                <li className="px-4 py-3 text-sm text-surface-200/50 text-center">
                                    {clients.length === 0 ? (emptyMessage || t('searchableSelect.empty', 'Nenhum cliente')) : t('searchableSelect.notFound', 'Nenhum cliente encontrado')}
                                </li>
                            ) : (
                                filteredClients.map(client => (
                                    <li
                                        key={client.id}
                                        onClick={() => {
                                            onChange(String(client.id));
                                            setIsOpen(false);
                                        }}
                                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${String(value) === String(client.id)
                                            ? 'bg-brand-500/20 text-brand-300'
                                            : 'text-surface-50 hover:bg-white/10'
                                            }`}
                                    >
                                        {client.name}
                                    </li>
                                ))
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
