"""
PawLog email templates — inline styles only (no <style> tags).
Brand color: #059669 (emerald-600)
"""

BRAND_COLOR = "#059669"
FONT_FAMILY = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"


def _base_layout(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;{FONT_FAMILY}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo -->
        <tr><td style="padding:0 0 24px 0;text-align:center;">
          <span style="font-size:28px;">🐾</span>
          <span style="font-size:22px;font-weight:700;color:#111827;margin-left:8px;vertical-align:middle;">PawLog</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:40px;">
          {body_html}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;color:#9ca3af;font-size:12px;">
          PawLog does not provide veterinary advice. &copy; 2025 PawLog
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _cta_button(label: str, url: str) -> str:
    return f"""<a href="{url}" style="display:inline-block;background:{BRAND_COLOR};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;margin-top:24px;">{label}</a>"""


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">{text}</h1>'


def _p(text: str) -> str:
    return f'<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.6;">{text}</p>'


def _badge(text: str, color: str = "#dc2626") -> str:
    return f'<span style="display:inline-block;background:{color}1a;color:{color};padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid {color}33;">{text}</span>'


def high_severity_alert(pet_name: str, flag_reason: str, severity: str, pet_url: str) -> str:
    severity_color = "#dc2626" if severity == "high" else "#d97706"
    body = f"""
{_h1(f"Health alert for {pet_name}")}
<div style="margin-bottom:16px;">{_badge(f"{severity.upper()} severity", severity_color)}</div>
{_p(f"The AI analysis agent has flagged a new observation for <strong>{pet_name}</strong> that may need attention.")}
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;"><strong>AI note:</strong> {flag_reason}</p>
</div>
{_p("Log in to review the full observation and consider scheduling a vet visit.")}
{_cta_button(f"View {pet_name}'s profile", pet_url)}
"""
    return _base_layout(f"Health alert for {pet_name}", body)


def vet_note_added(pet_name: str, note_content: str, vet_name: str, note_type: str, pet_url: str) -> str:
    note_type_label = note_type.replace("_", " ").capitalize()
    body = f"""
{_h1(f"New vet note for {pet_name}")}
<div style="margin-bottom:16px;">{_badge(note_type_label, BRAND_COLOR)}</div>
{_p(f"<strong>{vet_name}</strong> added a clinical note for <strong>{pet_name}</strong>.")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#14532d;line-height:1.6;">{note_content}</p>
</div>
{_cta_button(f"View {pet_name}'s profile", pet_url)}
"""
    return _base_layout(f"Vet note for {pet_name}", body)


def pet_share_invite(owner_name: str, pet_name: str, accept_url: str) -> str:
    body = f"""
{_h1("You've been invited to view a patient")}
{_p(f"<strong>{owner_name}</strong> has shared their pet <strong>{pet_name}</strong>'s health records with you on PawLog.")}
{_p("As their veterinarian, you'll have read access to health logs, medications, and the ability to add clinical notes.")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#14532d;"><strong>Patient:</strong> {pet_name}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#14532d;"><strong>Shared by:</strong> {owner_name}</p>
</div>
{_p("Click the button below to accept the invitation. You'll need to sign in or create a free PawLog account.")}
{_cta_button("Accept invitation", accept_url)}
<p style="margin-top:16px;font-size:13px;color:#9ca3af;">This invitation link expires in 7 days. If you did not expect this email, you can safely ignore it.</p>
"""
    return _base_layout(f"Invitation to view {pet_name} on PawLog", body)


def vet_summary_email(pet_name: str, summary_content: str, key_concerns: list, questions: list) -> str:
    concerns_html = ""
    if key_concerns:
        items = "".join(
            f'<li style="margin:0 0 6px 0;font-size:14px;color:#374151;">{c}</li>'
            for c in key_concerns
        )
        concerns_html = f"""
<p style="margin:16px 0 8px 0;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Key concerns</p>
<ul style="margin:0;padding-left:20px;">{items}</ul>"""

    questions_html = ""
    if questions:
        items = "".join(
            f'<li style="margin:0 0 6px 0;font-size:14px;color:#374151;">{q}</li>'
            for q in questions
        )
        questions_html = f"""
<p style="margin:16px 0 8px 0;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Questions to ask your vet</p>
<ul style="margin:0;padding-left:20px;">{items}</ul>"""

    body = f"""
{_h1(f"Vet visit summary for {pet_name}")}
{_p("Here is the AI-generated health summary you can bring to your next vet appointment.")}
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">{summary_content}</p>
  {concerns_html}
  {questions_html}
</div>
<p style="margin-top:16px;font-size:13px;color:#9ca3af;">This summary was generated by AI and is for informational purposes only. Always consult a licensed veterinarian.</p>
"""
    return _base_layout(f"Vet summary for {pet_name}", body)


def daily_log_reminder(pet_names: list, log_url: str) -> str:
    names = ", ".join(pet_names) if len(pet_names) <= 3 else f"{', '.join(pet_names[:2])} and {len(pet_names) - 2} more"
    body = f"""
{_h1("Don't forget to log today")}
{_p(f"You haven't logged any observations yet today for <strong>{names}</strong>.")}
{_p("Regular logging helps the AI detect health patterns and gives your vet better context. It only takes a minute.")}
{_cta_button("Log today's observations", log_url)}
<p style="margin-top:16px;font-size:13px;color:#9ca3af;">You're receiving this because you have pets on PawLog. You can update notification preferences in your account settings.</p>
"""
    return _base_layout("Daily log reminder", body)


def weekly_digest(pet_name: str, log_count: int, flag_count: int, pet_url: str) -> str:
    flag_text = f", with <strong>{flag_count} flagged observation{'s' if flag_count != 1 else ''}</strong>" if flag_count > 0 else ""
    flag_note = ""
    if flag_count > 0:
        flag_note = f'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#9a3412;">⚠️ {flag_count} log{"s" if flag_count != 1 else ""} {"were" if flag_count != 1 else "was"} flagged by the AI this week. Consider scheduling a vet check.</p></div>'

    body = f"""
{_h1(f"Weekly digest for {pet_name}")}
{_p(f"Here's a summary of this past week for <strong>{pet_name}</strong>.")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;">
  <p style="margin:0;font-size:32px;font-weight:700;color:{BRAND_COLOR};">{log_count}</p>
  <p style="margin:4px 0 0 0;font-size:14px;color:#374151;">health log{'s' if log_count != 1 else ''} recorded{flag_text}</p>
</div>
{flag_note}
{_p("Keep up the great work tracking your pet's health!")}
{_cta_button(f"View {pet_name}'s profile", pet_url)}
"""
    return _base_layout(f"Weekly digest for {pet_name}", body)


def medication_refill_alert(pet_name: str, med_name: str, end_date: str, pet_url: str) -> str:
    body = f"""
{_h1("Medication ending soon")}
<div style="margin-bottom:16px;">{_badge("Refill reminder", "#d97706")}</div>
{_p(f"<strong>{pet_name}</strong>'s medication <strong>{med_name}</strong> is scheduled to end on <strong>{end_date}</strong> — that's in 3 days.")}
{_p("If this is an ongoing prescription, contact your vet to arrange a refill in time.")}
{_cta_button("View medications", pet_url)}
"""
    return _base_layout(f"Medication ending soon: {med_name}", body)


def appointment_reminder_owner(pet_name: str, scheduled_at: str, vet_name: str, notes: str) -> str:
    notes_html = f'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#374151;">{notes}</p></div>' if notes else ""
    body = f"""
{_h1(f"Appointment reminder for {pet_name}")}
{_p(f"You have a vet appointment tomorrow for <strong>{pet_name}</strong>.")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#14532d;"><strong>Date &amp; time:</strong> {scheduled_at}</p>
  {f'<p style="margin:8px 0 0 0;font-size:14px;color:#14532d;"><strong>Vet:</strong> {vet_name}</p>' if vet_name else ""}
</div>
{notes_html}
{_p("Don't forget to bring any relevant health logs or medications.")}
"""
    return _base_layout(f"Appointment reminder: {pet_name}", body)


def appointment_reminder_vet(pet_name: str, owner_name: str, scheduled_at: str, notes: str) -> str:
    notes_html = f'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#374151;"><strong>Notes:</strong> {notes}</p></div>' if notes else ""
    body = f"""
{_h1(f"Appointment in 1 hour: {pet_name}")}
{_p(f"You have an appointment in approximately 1 hour.")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#14532d;"><strong>Patient:</strong> {pet_name}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#14532d;"><strong>Owner:</strong> {owner_name}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#14532d;"><strong>Time:</strong> {scheduled_at}</p>
</div>
{notes_html}
"""
    return _base_layout(f"Upcoming appointment: {pet_name}", body)


def vaccination_due_reminder(pet_name: str, vaccine_name: str, due_date: str, pet_url: str) -> str:
    body = f"""
{_h1(f"Vaccination due: {pet_name}")}
{_p(f"{pet_name}'s {vaccine_name} vaccination is due in the next 2 weeks.")}
<div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#713f12;"><strong>Pet:</strong> {pet_name}</p>
  <p style="margin:8px 0 0;font-size:14px;color:#713f12;"><strong>Vaccine:</strong> {vaccine_name}</p>
  <p style="margin:8px 0 0;font-size:14px;color:#713f12;"><strong>Due:</strong> {due_date}</p>
</div>
{_p("Contact your vet to schedule this vaccination.")}
{_cta_button(f"View {pet_name}'s records", pet_url)}
"""
    return _base_layout(f"Vaccination due: {vaccine_name} for {pet_name}", body)


def vet_weekly_digest(vet_name: str, flagged_patients: list, total_patients: int, dashboard_url: str) -> str:
    if not flagged_patients:
        patients_html = "<p style='color:#6b7280;font-size:14px;'>No flagged patients this week. All patients are looking good!</p>"
    else:
        rows = "".join([
            f'<tr><td style="padding:8px 12px;font-size:14px;color:#111827;">{p["name"]}</td>'
            f'<td style="padding:8px 12px;font-size:14px;color:#dc2626;">{p["flag_count"]} flag(s)</td></tr>'
            for p in flagged_patients
        ])
        patients_html = f"""
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <thead><tr style="background:#f9fafb;">
    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Patient</th>
    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Flags</th>
  </tr></thead>
  <tbody>{rows}</tbody>
</table>"""
    body = f"""
{_h1(f"Weekly digest — {vet_name}")}
{_p(f"Here's a summary of your {total_patients} patient(s) this week.")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#065f46;">{len(flagged_patients)} flagged patient(s)</p>
  <p style="margin:4px 0 0;font-size:14px;color:#065f46;">of {total_patients} total</p>
</div>
{patients_html}
{_cta_button("View patient dashboard", dashboard_url)}
"""
    return _base_layout(f"PawLog Weekly Digest — {vet_name}", body)


def co_owner_invite(owner_name: str, pet_name: str, accept_url: str) -> str:
    body = f"""
{_h1(f"You've been invited to co-manage {pet_name}")}
{_p(f"<strong>{owner_name}</strong> has invited you as a co-owner for <strong>{pet_name}</strong> on PawLog.")}
{_p("As a co-owner you can view health logs, log new observations, and manage medications.")}
<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#4c1d95;"><strong>Pet:</strong> {pet_name}</p>
  <p style="margin:8px 0 0;font-size:14px;color:#4c1d95;"><strong>Invited by:</strong> {owner_name}</p>
</div>
{_cta_button("Accept invitation", accept_url)}
<p style="margin-top:16px;font-size:13px;color:#9ca3af;">You'll need a free PawLog account to accept. If you did not expect this, you can ignore this email.</p>
"""
    return _base_layout(f"Co-owner invite: {pet_name}", body)


def vet_first_access(vet_name: str, pet_name: str, owner_name: str, pet_url: str) -> str:
    body = f"""
{_h1(f"Your vet has accessed {pet_name}'s records")}
{_p(f"Dr. {vet_name} has opened {pet_name}'s health profile for the first time.")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#14532d;"><strong>Vet:</strong> {vet_name}</p>
  <p style="margin:8px 0 0;font-size:14px;color:#14532d;"><strong>Pet:</strong> {pet_name}</p>
</div>
{_cta_button(f"View {pet_name}'s profile", pet_url)}
"""
    return _base_layout(f"{vet_name} accessed {pet_name}'s records", body)
