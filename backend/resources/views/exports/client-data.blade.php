<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Mes données personnelles — {{ config('app.name') }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #1a202c; background: #fff; }
        .body-inner { padding: 26px 40px; }

        .section { margin-bottom: 20px; }
        .section-title {
            font-size: 10px; font-weight: bold; text-transform: uppercase;
            letter-spacing: 0.08em; color: #1A5333;
            border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;
        }

        /* Grille clé / valeur (profil) */
        .kv-tbl { width: 100%; border-collapse: collapse; }
        .kv-tbl td { padding: 5px 12px 5px 0; vertical-align: top; }
        .kv-lbl { font-size: 10px; color: #718096; width: 34%; }
        .kv-val { font-size: 12px; font-weight: bold; color: #1a202c; }

        /* Tableaux de données */
        .data-tbl { width: 100%; border-collapse: collapse; margin-top: 2px; }
        .data-tbl thead tr { background: #1E673D; }
        .data-tbl thead th {
            color: #ffffff; padding: 7px 10px; text-align: left;
            font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.03em;
        }
        .data-tbl tbody td { padding: 7px 10px; font-size: 11px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .data-tbl tbody tr { background: #f7fafc; }
        .data-tbl tbody tr.even { background: #ffffff; }
        .data-tbl tbody tr.total-row td {
            background: #eaf3ee; font-weight: bold; color: #1A5333;
            border-top: 2px solid #1E673D; border-bottom: none;
        }
        .text-right { text-align: right; }

        .empty { font-size: 11px; color: #a0aec0; font-style: italic; padding: 6px 0; }

        .footer {
            margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0;
            text-align: center; font-size: 9px; color: #a0aec0; line-height: 1.5;
        }
        .pill {
            display: inline-block; padding: 2px 8px; border-radius: 10px;
            font-size: 9px; font-weight: bold;
        }
    </style>
</head>
<body>

{{-- ══════════════ EN-TÊTE ══════════════ --}}
<div style="background:#1A5333; padding:22px 40px; color:#ffffff;">
    <table style="width:100%; border-collapse:collapse;"><tr>
        <td style="vertical-align:top;">
            <div style="font-size:20px; font-weight:bold; letter-spacing:0.02em;">{{ config('app.name') }}</div>
            <div style="font-size:11px; color:#BDE6CE; margin-top:3px;">Export de vos données personnelles</div>
        </td>
        <td style="text-align:right; vertical-align:top;">
            <div style="font-size:10px; text-transform:uppercase; color:#BDE6CE; letter-spacing:0.05em;">Document généré le</div>
            <div style="font-size:13px; font-weight:bold; color:#ffffff; margin-top:4px;">{{ $issuedAt->format('d/m/Y à H:i') }}</div>
        </td>
    </tr></table>
</div>

<div class="body-inner">

    <p style="font-size:11px; color:#4a5568; margin-bottom:20px; line-height:1.5;">
        Bonjour {{ $client->first_name }}, voici l'ensemble des données personnelles que
        {{ config('app.name') }} conserve à votre sujet, conformément à votre droit d'accès.
    </p>

    {{-- ── Identité ── --}}
    <div class="section">
        <div class="section-title">Identité</div>
        <table class="kv-tbl">
            @foreach($data['identite'] as $label => $value)
                <tr>
                    <td class="kv-lbl">{{ $label }}</td>
                    <td class="kv-val">{{ $value }}</td>
                </tr>
            @endforeach
        </table>
    </div>

    {{-- ── Contact d'urgence ── --}}
    <div class="section">
        <div class="section-title">Contact d'urgence</div>
        <table class="kv-tbl">
            @foreach($data['urgence'] as $label => $value)
                <tr>
                    <td class="kv-lbl">{{ $label }}</td>
                    <td class="kv-val">{{ $value }}</td>
                </tr>
            @endforeach
        </table>
    </div>

    {{-- ── Pièces d'identité ── --}}
    <div class="section">
        <div class="section-title">Pièces d'identité</div>
        @if(count($data['pieces_identite']))
            @if($data['id_document_type'])
                <p style="font-size:11px; color:#4a5568; margin-bottom:6px;">Type : <strong>{{ $data['id_document_type'] }}</strong></p>
            @endif
            <table class="kv-tbl">
                @foreach($data['pieces_identite'] as $name)
                    <tr><td class="kv-val" style="padding:4px 0;">• {{ $name }}</td></tr>
                @endforeach
            </table>
        @else
            <div class="empty">Aucune pièce d'identité enregistrée.</div>
        @endif
    </div>

    {{-- ── Réservations ── --}}
    <div class="section">
        <div class="section-title">Réservations ({{ count($data['reservations']) }})</div>
        @if(count($data['reservations']))
            <table class="data-tbl">
                <thead><tr>
                    <th>Référence</th><th>Chambre</th><th>Séjour</th><th>Statut</th><th class="text-right">Montant</th>
                </tr></thead>
                <tbody>
                    @foreach($data['reservations'] as $i => $r)
                        <tr class="{{ $i % 2 ? 'even' : '' }}">
                            <td>{{ $r['ref'] }}</td>
                            <td>{{ $r['chambre'] }}</td>
                            <td>{{ $r['sejour'] }}</td>
                            <td>{{ $r['statut'] }}</td>
                            <td class="text-right">{{ $r['montant'] }}</td>
                        </tr>
                    @endforeach
                    <tr class="total-row">
                        <td colspan="4">Total des réservations</td>
                        <td class="text-right">{{ $data['reservations_total'] }}</td>
                    </tr>
                </tbody>
            </table>
        @else
            <div class="empty">Aucune réservation.</div>
        @endif
    </div>

    {{-- ── Paiements ── --}}
    <div class="section">
        <div class="section-title">Paiements ({{ count($data['paiements']) }})</div>
        @if(count($data['paiements']))
            <table class="data-tbl">
                <thead><tr>
                    <th>Date</th><th>Moyen</th><th>Référence</th><th>Statut</th><th class="text-right">Montant</th>
                </tr></thead>
                <tbody>
                    @foreach($data['paiements'] as $i => $p)
                        <tr class="{{ $i % 2 ? 'even' : '' }}">
                            <td>{{ $p['date'] }}</td>
                            <td>{{ $p['moyen'] }}</td>
                            <td>{{ $p['reference'] }}</td>
                            <td>{{ $p['statut'] }}</td>
                            <td class="text-right">{{ $p['montant'] }}</td>
                        </tr>
                    @endforeach
                    <tr class="total-row">
                        <td colspan="4">Total payé (paiements réussis)</td>
                        <td class="text-right">{{ $data['paiements_total'] }}</td>
                    </tr>
                </tbody>
            </table>
        @else
            <div class="empty">Aucun paiement.</div>
        @endif
    </div>

    {{-- ── Remboursements ── --}}
    <div class="section">
        <div class="section-title">Remboursements ({{ count($data['remboursements']) }})</div>
        @if(count($data['remboursements']))
            <table class="data-tbl">
                <thead><tr>
                    <th>Date</th><th>Statut</th><th class="text-right">Montant</th>
                </tr></thead>
                <tbody>
                    @foreach($data['remboursements'] as $i => $r)
                        <tr class="{{ $i % 2 ? 'even' : '' }}">
                            <td>{{ $r['date'] }}</td>
                            <td>{{ $r['statut'] }}</td>
                            <td class="text-right">{{ $r['montant'] }}</td>
                        </tr>
                    @endforeach
                    <tr class="total-row">
                        <td colspan="2">Total remboursé (approuvés)</td>
                        <td class="text-right">{{ $data['remboursements_total'] }}</td>
                    </tr>
                </tbody>
            </table>
        @else
            <div class="empty">Aucun remboursement.</div>
        @endif
    </div>

    {{-- ── Avis ── --}}
    <div class="section">
        <div class="section-title">Mes avis ({{ count($data['avis']) }})</div>
        @if(count($data['avis']))
            <table class="data-tbl">
                <thead><tr>
                    <th>Date</th><th>Note</th><th>Commentaire</th>
                </tr></thead>
                <tbody>
                    @foreach($data['avis'] as $i => $a)
                        <tr class="{{ $i % 2 ? 'even' : '' }}">
                            <td style="white-space:nowrap;">{{ $a['date'] }}</td>
                            <td style="white-space:nowrap;">{{ $a['note'] }}</td>
                            <td>{{ $a['comment'] }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="empty">Aucun avis publié.</div>
        @endif
    </div>

    {{-- ── Réclamations ── --}}
    <div class="section">
        <div class="section-title">Réclamations ({{ count($data['reclamations']) }})</div>
        @if(count($data['reclamations']))
            <table class="data-tbl">
                <thead><tr>
                    <th>Date</th><th>Sujet</th><th>Message</th><th>Statut</th>
                </tr></thead>
                <tbody>
                    @foreach($data['reclamations'] as $i => $c)
                        <tr class="{{ $i % 2 ? 'even' : '' }}">
                            <td style="white-space:nowrap;">{{ $c['date'] }}</td>
                            <td>{{ $c['sujet'] }}</td>
                            <td>{{ $c['message'] }}</td>
                            <td style="white-space:nowrap;">{{ $c['statut'] }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="empty">Aucune réclamation.</div>
        @endif
    </div>

    <div class="footer">
        Document généré automatiquement par {{ config('app.name') }} au titre de votre droit d'accès (RGPD).<br>
        Ces données sont strictement confidentielles et vous sont personnelles.<br>
        © {{ $issuedAt->format('Y') }} {{ config('app.name') }} — Tous droits réservés.
    </div>

</div>
</body>
</html>
