/**
 * PaymentPlanSelector
 * Cartes pour choisir entre paiement intégral et paiement en deux tranches.
 */
export default function PaymentPlanSelector({ value, onChange, totalAmount, disabled = false }) {
  const half = totalAmount ? totalAmount / 2 : null;

  const PLANS = [
    {
      id:    'full',
      title: 'Paiement intégral',
      desc:  'Réglez la totalité maintenant et votre réservation est confirmée.',
      badge: 'Recommandé',
      badgeCls: 'bg-emerald-100 text-emerald-700',
      ring:  'ring-emerald-400',
      border:'border-emerald-400',
      bg:    'bg-emerald-50',
      dot:   'bg-emerald-500 border-emerald-500',
      amountLabel: totalAmount ? `${totalAmount.toLocaleString('fr-FR')} XOF` : null,
    },
    {
      id:    'partial',
      title: 'Paiement en 2 fois',
      desc:  'Versez 50 % maintenant, puis réglez le solde à votre arrivée ou en ligne.',
      badge: 'Flexibilité',
      badgeCls: 'bg-blue-100 text-blue-700',
      ring:  'ring-blue-400',
      border:'border-blue-400',
      bg:    'bg-blue-50',
      dot:   'bg-blue-500 border-blue-500',
      amountLabel: half ? `${half.toLocaleString('fr-FR')} XOF maintenant` : null,
      sub:   half ? `+ ${half.toLocaleString('fr-FR')} XOF à l'arrivée` : null,
    },
  ];

  return (
    <div className="space-y-3">
      {PLANS.map((plan) => {
        const active = value === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(plan.id)}
            className={[
              'relative w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150',
              active
                ? `${plan.border} ${plan.bg} ring-2 ${plan.ring}`
                : 'border-gray-200 bg-white hover:border-gray-300',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {/* Radio visuel */}
            <span className={[
              'mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center',
              active ? plan.dot : 'border-gray-300 bg-white',
            ].join(' ')}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{plan.title}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${plan.badgeCls}`}>
                  {plan.badge}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{plan.desc}</p>
              {plan.amountLabel && (
                <p className="text-sm font-bold text-gray-800 mt-1.5">
                  {plan.amountLabel}
                  {plan.sub && (
                    <span className="text-xs font-normal text-gray-500 ml-1">({plan.sub})</span>
                  )}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
