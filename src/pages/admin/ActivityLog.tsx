import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { ActivityLogEntry } from '../../types';

const ACTION_LABELS: Record<string, string> = {
  CREDIT_CREE: 'Crédit accordé',
  PAIEMENT_ENREGISTRE: 'Paiement en espèces',
  REMISE_ACCORDEE: 'Remise accordée',
  CLIENT_CREE: 'Client créé',
};

export default function ActivityLog() {
  const [params] = useSearchParams();
  const commercialId = params.get('commercialId') || undefined;
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await api.get('/activity-log', { params: { commercialId } });
      setLogs(data);
      setLoading(false);
    }
    load();
  }, [commercialId]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Journal d'activité</h1>
      <p className="text-gray-500 text-sm mb-6">
        Toutes les actions effectuées par les commerciaux (crédits, paiements, remises) pour supervision.
      </p>

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">Aucune activité enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log._id} className={`bg-white rounded-lg shadow-sm p-4 flex items-start justify-between border-l-4 ${log.niveau === 'important' ? 'border-amber-500' : 'border-gray-200'}`}>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-primary-700">{log.commercialNom}</span> — {ACTION_LABELS[log.action] || log.action}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{log.description}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                {new Date(log.createdAt).toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
