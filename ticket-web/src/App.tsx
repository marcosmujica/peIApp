import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar,
  CreditCard,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  ChevronRight,
  DollarSign,
  FileText,
  Wallet,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://api.peiapp.tech';

interface Log {
  logId: string;
  action: string;
  oldValue: string;
  newValue: string;
  paymentMethod?: string;
  comment?: string;
  attachmentUrl?: string;
  createdAt: string;
}

interface Ticket {
  ticketId: string;
  description: string;
  amount: number;
  amountPaid: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  shortId: string;
  owner: {
    displayName: string;
  };
  paymentProcedure?: string;
  comment?: string;
  logs?: Log[];
}

function App() {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'details' | 'pay' | 'reschedule' | 'cancel'>('details');

  // Form states
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [payDesc, setPayDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [payFile, setPayFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const shortId = new URLSearchParams(window.location.search).get('id') || window.location.pathname.split('/').pop() || '';

  useEffect(() => {
    if (shortId) {
      fetchTicket();
    } else {
      setError('ID de ticket no proporcionado');
      setLoading(false);
    }
  }, [shortId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/tickets/public/${shortId}`);
      setTicket(res.data);
      setNewDueDate(res.data.dueDate.split('T')[0]);
      setPayAmount((Number(res.data.amount) - Number(res.data.amountPaid)).toString());
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo encontrar el ticket');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let attachmentUrl = undefined;
      if (payFile) {
        const formData = new FormData();
        formData.append('file', payFile);
        const uploadRes = await axios.post(`${API_BASE}/tickets/chat/upload`, formData);
        attachmentUrl = uploadRes.data.url;
      }

      await axios.post(`${API_BASE}/tickets/public/${shortId}/payment`, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        description: payDesc,
        attachmentUrl
      });
      setSuccessMsg('¡Pago registrado con éxito!');
      await fetchTicket();
      setTimeout(() => {
        setSuccessMsg(null);
        setView('details');
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al registrar pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.patch(`${API_BASE}/tickets/public/${shortId}/due-date`, {
        dueDate: `${newDueDate}T12:00:00`
      });
      setSuccessMsg('Fecha actualizada correctamente');
      await fetchTicket();
      setTimeout(() => {
        setSuccessMsg(null);
        setView('details');
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar fecha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE}/tickets/public/${shortId}/cancel`, {
        reason: cancelReason
      });
      setSuccessMsg('Ticket cancelado');
      await fetchTicket();
      setTimeout(() => {
        setSuccessMsg(null);
        setView('details');
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cancelar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (val: number | string) => {
    return Number(val).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const getCurrencyName = (code: string) => {
    const map: Record<string, string> = {
      'UYU': 'Pesos Uruguayos',
      'USD': 'Dólares',
      'ARS': 'Pesos Argentinos',
      'BRL': 'Reales'
    };
    return map[code] || code;
  };

  if (loading) return (
    <div className="flex-center full-page">
      <div className="loader"></div>
    </div>
  );

  if (error || !ticket) return (
    <div className="flex-center full-page p-4 text-center">
      <div className="card max-w-md w-full p-8">
        <AlertCircle size={48} className="text-danger mb-4" />
        <h2 className="text-2xl font-bold mb-2">Ups, algo salió mal</h2>
        <p className="text-muted mb-6">{error || 'El ticket que buscas no existe o ha expirado.'}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary w-full">Reintentar</button>
      </div>
    </div>
  );

  const isPending = ticket.status === 'pending';
  const remaining = Number(ticket.amount) - Number(ticket.amountPaid);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-group">
          <a href="https://www.peiapp.tech" className="logo-container">
            <span className="logo-text">peIApp</span>
          </a>
          <span className="slogan">Mis finanzas gratis</span>
        </div>
        <div className="store-badges">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
            alt="App Store"
            className="store-badge"
          />
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
            alt="Play Store"
            className="store-badge"
          />
        </div>
      </header>

      <main className="main-content">
        <AnimatePresence mode="wait">
          {view === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="ticket-card"
            >
              <div className="status-badge" data-status={ticket.status}>
                {ticket.status === 'completed' ? <CheckCircle2 size={16} /> :
                  ticket.status === 'cancelled' ? <XCircle size={16} /> :
                    <Clock size={16} />}
                {ticket.status === 'completed' ? 'Pagado' :
                  ticket.status === 'cancelled' ? 'Cancelado' :
                    'Pendiente'}
              </div>

              <h1 className="ticket-desc">{ticket.description || 'Sin descripción'}</h1>

              <div className="amount-grid">
                <div className="amount-item">
                  <div className="label-row">
                    <span className="label">Monto Total</span>
                    <span className="currency-label">{getCurrencyName(ticket.currency)}</span>
                  </div>
                  <span className="value big">{formatAmount(ticket.amount)}</span>
                </div>
                {ticket.amountPaid > 0 && (
                  <div className="amount-item">
                    <div className="label-row">
                      <span className="label">Pagado</span>
                      <span className="currency-label">{getCurrencyName(ticket.currency)}</span>
                    </div>
                    <span className="value text-success">{formatAmount(ticket.amountPaid)}</span>
                  </div>
                )}
                {isPending && ticket.amountPaid > 0 && (
                  <div className="amount-item">
                    <div className="label-row">
                      <span className="label">Resta</span>
                      <span className="currency-label">{getCurrencyName(ticket.currency)}</span>
                    </div>
                    <span className="value text-warning">{formatAmount(remaining)}</span>
                  </div>
                )}
              </div>

              <div className="info-list">
                <div className="info-item">
                  <Calendar size={20} className="text-primary" />
                  <div>
                    <span className="label">Vencimiento</span>
                    <span className="value">{format(new Date(ticket.dueDate), "d 'de' MMMM, yyyy", { locale: es })}</span>
                  </div>
                </div>
                <div className="info-item">
                  <Wallet size={20} className="text-primary" />
                  <div>
                    <span className="label">Generado por</span>
                    <span className="value">{ticket.owner?.displayName || 'Cargando...'}</span>
                  </div>
                </div>
                {ticket.paymentProcedure && (
                  <div className="info-item">
                    <CreditCard size={20} className="text-primary" />
                    <div>
                      <span className="label">Procedimiento de Pago</span>
                      <span className="value">{ticket.paymentProcedure}</span>
                    </div>
                  </div>
                )}
                {ticket.comment && (
                  <div className="info-item">
                    <MessageSquare size={20} className="text-primary" />
                    <div>
                      <span className="label">Descripción / Nota</span>
                      <span className="value">{ticket.comment}</span>
                    </div>
                  </div>
                )}
              </div>

              {isPending && (
                <div className="actions-grid mt-8">
                  <button onClick={() => setView('pay')} className="btn btn-primary">
                    <CreditCard size={20} /> Registrar un pago
                  </button>
                  <button onClick={() => setView('reschedule')} className="btn btn-outline">
                    <Clock size={20} /> Cambiar fecha de pago
                  </button>
                  <button onClick={() => setView('cancel')} className="btn btn-ghost text-danger">
                    <XCircle size={20} /> Cancelar Ticket
                  </button>
                </div>
              )}

              {!isPending && (
                <div className="mt-8 text-center p-4 bg-muted rounded-xl">
                  <p className="text-muted">Este ticket ya no requiere acciones adicionales.</p>
                </div>
              )}

              {/* Historial de Actividad / Log de Acciones */}
              {ticket.logs && ticket.logs.length > 0 && (
                <div className="activity-log mt-8">
                  <h3 className="section-title text-lg font-bold mb-4 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} className="text-primary" />
                    Historial de Actividad
                  </h3>
                  <div className="timeline-container mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {ticket.logs.map((log) => {
                      let actionText = '';
                      let actionIcon = <Clock size={16} className="text-slate-400" />;

                      switch (log.action) {
                        case 'created':
                        case 'ticket_created':
                          actionText = 'Ticket creado';
                          actionIcon = <CheckCircle2 size={16} className="text-primary" />;
                          break;
                        case 'payment_received':
                          const amountPaid = Number(log.newValue) - Number(log.oldValue);
                          actionText = `Pago registrado: ${ticket.currency} ${formatAmount(amountPaid)}`;
                          actionIcon = <DollarSign size={16} className="text-success" />;
                          break;
                        case 'due_date_change':
                        case 'due_date_changed':
                        case 'rescheduled':
                          const formattedDate = log.newValue ? format(new Date(log.newValue.split('T')[0] + 'T12:00:00'), "d 'de' MMM, yyyy", { locale: es }) : '';
                          actionText = `Fecha de vencimiento cambiada a ${formattedDate}`;
                          actionIcon = <Calendar size={16} className="text-warning" />;
                          break;
                        case 'cancelled':
                        case 'status_cancelled':
                          actionText = 'Ticket cancelado';
                          actionIcon = <XCircle size={16} className="text-danger" />;
                          break;
                        case 'status_completed':
                          actionText = 'Ticket completado';
                          actionIcon = <CheckCircle2 size={16} className="text-success" />;
                          break;
                        default:
                          actionText = log.action || 'Acción registrada';
                      }

                      return (
                        <div key={log.logId} className="history-item" style={{
                          background: '#f8fafc',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div className="history-main" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div className="history-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {actionIcon}
                              <span className="history-amount" style={{ fontWeight: '600', fontSize: '15px' }}>{actionText}</span>
                            </div>
                            <span className="history-meta" style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {format(new Date(log.createdAt), "d 'de' MMM, HH:mm'hs'", { locale: es })}
                            </span>
                          </div>

                          {log.paymentMethod && (
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                              Método: {log.paymentMethod}
                            </div>
                          )}

                          {log.comment && (
                            <p className="history-comment" style={{
                              margin: '4px 0 0 0',
                              fontSize: '14px',
                              color: '#475569',
                              fontStyle: 'italic',
                              background: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #f1f5f9'
                            }}>
                              "{log.comment}"
                            </p>
                          )}

                          {log.attachmentUrl && (
                            <div style={{ marginTop: '8px' }}>
                              <a
                                href={log.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="attachment-link"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: 'var(--color-primary, #4f46e5)',
                                  textDecoration: 'none'
                                }}
                              >
                                <FileText size={16} />
                                Ver Documento Adjunto
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'pay' && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="ticket-card"
            >
              <button onClick={() => setView('details')} className="btn-back mb-4">
                <ChevronRight style={{ transform: 'rotate(180deg)' }} size={20} /> Volver
              </button>
              <h2 className="text-2xl font-bold mb-6">Cargar Pago</h2>

              <form onSubmit={handlePayment} className="space-y-4">
                <div className="form-group">
                  <label>Monto a pagar ({ticket.currency})</label>
                  <div className="input-with-icon">
                    <DollarSign size={18} />
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                      max={remaining}
                      min={1}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Medio de Pago</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Tarjeta</option>
                    <option>Mercado Pago</option>
                    <option>Otro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Nota / Comentario</label>
                  <textarea
                    value={payDesc}
                    onChange={(e) => setPayDesc(e.target.value)}
                    placeholder="Ej: Transferencia enviada por WhatsApp"
                  />
                </div>

                <div className="form-group">
                  <label>Comprobante (Opcional)</label>
                  <div className="file-upload">
                    <Upload size={24} />
                    <span>{payFile ? payFile.name : 'Toca para subir una imagen'}</span>
                    <input
                      id="file-input"
                      type="file"
                      className="hidden-file"
                      onChange={(e) => setPayFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full mt-6">
                  {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </form>
            </motion.div>
          )}

          {view === 'reschedule' && (
            <motion.div
              key="reschedule"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="ticket-card"
            >
              <button onClick={() => setView('details')} className="btn-back mb-4">
                <ChevronRight style={{ transform: 'rotate(180deg)' }} size={20} /> Volver
              </button>
              <h2 className="text-2xl font-bold mb-6">Nueva Fecha de Pago</h2>

              <form onSubmit={handleReschedule} className="space-y-4">
                <div className="form-group">
                  <label>¿Cuándo vas a pagar?</label>
                  <div className="input-with-icon">
                    <Calendar size={18} />
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <p className="text-muted text-sm italic">
                  * Se notificará al generador del ticket sobre el cambio de fecha.
                </p>

                <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full mt-6">
                  {isSubmitting ? 'Guardando...' : 'Cambiar Fecha'}
                </button>
              </form>
            </motion.div>
          )}

          {view === 'cancel' && (
            <motion.div
              key="cancel"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="ticket-card"
            >
              <button onClick={() => setView('details')} className="btn-back mb-4">
                <ChevronRight style={{ transform: 'rotate(180deg)' }} size={20} /> Volver
              </button>
              <h2 className="text-2xl font-bold mb-2 text-danger">Anular Ticket</h2>
              <p className="text-muted mb-6">Esta acción no se puede deshacer. Se le notificará al dueño del ticket.</p>

              <form onSubmit={handleCancel} className="space-y-4">
                <div className="form-group">
                  <label>Motivo (Opcional)</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ej: Error en el monto, ya fue pagado por otro medio..."
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className="btn btn-danger w-full mt-6">
                  {isSubmitting ? 'Cancelando...' : 'Confirmar Anulación'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="toast"
          >
            <CheckCircle2 size={20} />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="app-footer">
        <p>&copy; peIApp Financial Services</p>
      </footer>
    </div>
  );
}

export default App;
