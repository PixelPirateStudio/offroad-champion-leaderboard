import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useRequireAdmin } from '@/contexts/AdminAuthContext';
import { adminApi } from '@/services/adminApi';
import { BanknotesIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PaymentDetails {
  provider?: string;
  transferId?: string;
  payoutId?: string;
  status?: string;
  estimatedArrival?: number;
}

interface Redemption {
  redemptionId: string;
  userId: string;
  amount: string;
  deductedAmount: string;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  email: string | null;
  paymentMethod: string;
  paymentDetails: PaymentDetails | null;
  notes: string | null;
  failureReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  user?: { username: string };
}

interface RedemptionsResult {
  redemptions: Redemption[];
  total: number;
}

// --- Confirm modal for simple actions (Process) ---
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  confirmColor?: string;
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, description, confirmText = 'Confirm', confirmColor = 'bg-purple-600 hover:bg-purple-700' }: ConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose} />
        <div className="relative bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6 max-w-md w-full z-50">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">{description}</p>
          {error && (
            <div className="mb-4 rounded-md bg-red-900/30 border border-red-500/50 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`flex-1 py-2 px-4 ${confirmColor} text-white rounded-lg text-sm transition-colors disabled:opacity-50`}
            >
              {isSubmitting ? 'Processing...' : confirmText}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 bg-[#190F31] hover:bg-purple-900/30 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Reason modal (Fail / Refund) ---
interface ReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  confirmColor?: string;
  placeholder?: string;
}

function ReasonModal({ isOpen, onClose, onConfirm, title, description, confirmText = 'Confirm', confirmColor = 'bg-red-600 hover:bg-red-700', placeholder = 'Enter reason...' }: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError('Reason is required'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm(reason);
      setReason('');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => { setReason(''); setError(''); onClose(); };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={handleClose} />
        <div className="relative bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6 max-w-md w-full z-50">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">{description}</p>
          {error && (
            <div className="mb-4 rounded-md bg-red-900/30 border border-red-500/50 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className={`flex-1 py-2 px-4 ${confirmColor} text-white rounded-lg text-sm transition-colors disabled:opacity-50`}>
                {isSubmitting ? 'Submitting...' : confirmText}
              </button>
              <button type="button" onClick={handleClose} disabled={isSubmitting} className="flex-1 py-2 px-4 bg-[#190F31] hover:bg-purple-900/30 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Complete modal (needs payoutTransactionId) ---
interface CompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payoutTransactionId: string, notes: string) => Promise<void>;
  redemption: Redemption | null;
}

function CompleteModal({ isOpen, onClose, onConfirm, redemption }: CompleteModalProps) {
  const [payoutId, setPayoutId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill payoutId from paymentDetails if available
  useEffect(() => {
    if (redemption?.paymentDetails?.payoutId) {
      setPayoutId(redemption.paymentDetails.payoutId);
    }
  }, [redemption]);

  if (!isOpen || !redemption) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutId.trim()) { setError('Payout transaction ID is required'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm(payoutId, notes);
      setPayoutId('');
      setNotes('');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => { setPayoutId(''); setNotes(''); setError(''); onClose(); };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={handleClose} />
        <div className="relative bg-[#0E0A1B] border border-purple-900/30 rounded-lg p-6 max-w-md w-full z-50">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Mark as Completed</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Confirm that the Stripe payout for <span className="text-white font-medium">{redemption.user?.username}</span> (${parseFloat(redemption.amount).toFixed(2)}) has completed.
          </p>
          {error && (
            <div className="mb-4 rounded-md bg-red-900/30 border border-red-500/50 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Payout Transaction ID <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={payoutId}
                onChange={(e) => setPayoutId(e.target.value)}
                placeholder="po_..."
                className="w-full px-3 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional admin notes..."
                className="w-full px-3 py-2 bg-[#190F31] border border-purple-900/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="flex-1 py-2 px-4 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
                {isSubmitting ? 'Completing...' : 'Mark Completed'}
              </button>
              <button type="button" onClick={handleClose} disabled={isSubmitting} className="flex-1 py-2 px-4 bg-[#190F31] hover:bg-purple-900/30 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  processing: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  completed:  'bg-green-900/40 text-green-300 border-green-700/40',
  failed:     'bg-red-900/40 text-red-300 border-red-700/40',
  refunded:   'bg-gray-700/40 text-gray-300 border-gray-600/40',
};

const STATUS_TABS = ['all', 'pending', 'processing', 'completed', 'failed', 'refunded'] as const;

export default function RedemptionsPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAdmin();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  // Modals
  const [processTarget, setProcessTarget] = useState<Redemption | null>(null);
  const [failTarget, setFailTarget] = useState<Redemption | null>(null);
  const [refundTarget, setRefundTarget] = useState<Redemption | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Redemption | null>(null);

  useEffect(() => {
    if (isAuthenticated) loadRedemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, statusFilter]);

  const loadRedemptions = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { limit: 100, offset: 0 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await adminApi.getRedemptions(params) as RedemptionsResult;
      setRedemptions(data.redemptions ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError((err as Error).message || 'Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!processTarget) return;
    await adminApi.processRedemption(processTarget.redemptionId);
    await loadRedemptions();
  };

  const handleFail = async (reason: string) => {
    if (!failTarget) return;
    await adminApi.failRedemption(failTarget.redemptionId, reason);
    await loadRedemptions();
  };

  const handleRefund = async (reason: string) => {
    if (!refundTarget) return;
    await adminApi.refundRedemption(refundTarget.redemptionId, reason);
    await loadRedemptions();
  };

  const handleComplete = async (payoutTransactionId: string, notes: string) => {
    if (!completeTarget) return;
    await adminApi.completeRedemption(completeTarget.redemptionId, payoutTransactionId, notes || undefined);
    await loadRedemptions();
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Redemptions</h1>
          <p className="mt-2 text-gray-400">
            Manage withdrawal requests. Process pending requests to trigger Stripe payouts.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-500/50 p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                statusFilter === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#0E0A1B] border border-purple-900/30 text-gray-400 hover:text-white hover:border-purple-500'
              }`}
            >
              {tab}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-500 self-center">
            {total} result{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="bg-[#0E0A1B] border border-purple-900/30 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-400">Loading...</div>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <BanknotesIcon className="h-10 w-10 text-gray-600" />
              <p className="text-gray-500">No redemptions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-900/30 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">User</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Email</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Amount</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Deducted</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Requested</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Payout ID</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr key={r.redemptionId} className="border-b border-purple-900/20 hover:bg-purple-900/10">
                      <td className="px-4 py-3 text-white font-medium">
                        {r.user?.username ?? r.userId.slice(0, 8) + '...'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{r.email ?? '—'}</td>
                      <td className="px-4 py-3 text-green-400 font-medium">
                        ${parseFloat(r.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-orange-400">
                        ${parseFloat(r.deductedAmount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium capitalize ${STATUS_COLORS[r.status] ?? ''}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(r.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        {r.paymentDetails?.payoutId ?? r.paymentDetails?.transferId ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setProcessTarget(r)}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs transition-colors"
                              >
                                Process
                              </button>
                              <button
                                onClick={() => setFailTarget(r)}
                                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors"
                              >
                                Fail
                              </button>
                              <button
                                onClick={() => setRefundTarget(r)}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                              >
                                Refund
                              </button>
                            </>
                          )}
                          {r.status === 'processing' && (
                            <>
                              <button
                                onClick={() => setCompleteTarget(r)}
                                className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs transition-colors"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => setFailTarget(r)}
                                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors"
                              >
                                Fail
                              </button>
                            </>
                          )}
                          {(r.status === 'completed' || r.status === 'failed' || r.status === 'refunded') && (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-300 mb-2">Payout Workflow</h3>
          <ul className="text-sm text-purple-200 space-y-1 list-disc list-inside">
            <li><strong>Process</strong> — triggers an immediate Stripe Connect transfer + payout to the user&apos;s linked bank. Requires the user to have completed Stripe onboarding.</li>
            <li><strong>Complete</strong> — marks the payout as settled. Use after confirming the bank transfer arrived.</li>
            <li><strong>Fail</strong> — marks as failed and refunds the gains back to the user.</li>
            <li><strong>Refund</strong> — cancels a pending request and restores the user&apos;s gains.</li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={!!processTarget}
        onClose={() => setProcessTarget(null)}
        onConfirm={handleProcess}
        title="Process Withdrawal"
        description={`Initiate a Stripe payout of $${processTarget ? parseFloat(processTarget.amount).toFixed(2) : '0.00'} to ${processTarget?.user?.username ?? 'this user'}. This will immediately transfer funds via Stripe Connect.`}
        confirmText="Process & Pay Out"
        confirmColor="bg-purple-600 hover:bg-purple-500"
      />

      <ReasonModal
        isOpen={!!failTarget}
        onClose={() => setFailTarget(null)}
        onConfirm={handleFail}
        title="Fail Redemption"
        description={`Mark this redemption as failed and refund $${failTarget ? parseFloat(failTarget.deductedAmount).toFixed(2) : '0.00'} gains back to ${failTarget?.user?.username ?? 'the user'}.`}
        confirmText="Mark Failed"
        confirmColor="bg-red-700 hover:bg-red-600"
        placeholder="Reason for failure..."
      />

      <ReasonModal
        isOpen={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={handleRefund}
        title="Refund Redemption"
        description={`Cancel this withdrawal and return $${refundTarget ? parseFloat(refundTarget.deductedAmount).toFixed(2) : '0.00'} gains back to ${refundTarget?.user?.username ?? 'the user'}.`}
        confirmText="Refund"
        confirmColor="bg-gray-600 hover:bg-gray-500"
        placeholder="Reason for refund..."
      />

      <CompleteModal
        isOpen={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        redemption={completeTarget}
      />
    </AdminLayout>
  );
}
