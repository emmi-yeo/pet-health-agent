import os
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler(timezone="UTC")


async def daily_reminder_job():
    """Send reminder to owners who haven't logged today."""
    from email_service import send_email
    from email_templates import daily_log_reminder
    try:
        from supabase import create_client
        db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        today = datetime.now(timezone.utc).date().isoformat()
        # Get all owners
        pets_result = db.from_("pets").select("user_id, name").execute()
        # Group pets by user
        user_pets: dict = {}
        for pet in (pets_result.data or []):
            uid = pet["user_id"]
            user_pets.setdefault(uid, []).append(pet["name"])
        # Find users with no log today
        logs_today = db.from_("health_logs").select("user_id").gte("logged_at", today).execute()
        logged_users = {l["user_id"] for l in (logs_today.data or [])}
        for user_id, pet_names in user_pets.items():
            if user_id not in logged_users:
                user_result = db.auth.admin.get_user_by_id(user_id)
                email = user_result.user.email if user_result.user else None
                if email:
                    send_email(
                        email,
                        f"Don't forget to log today for {', '.join(pet_names)}",
                        daily_log_reminder(
                            pet_names,
                            os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/dashboard"
                        )
                    )
    except Exception as e:
        print(f"[SCHEDULER daily_reminder] {e}")


async def weekly_digest_job():
    """Send weekly digest to all owners on Sunday."""
    from email_service import send_email
    from email_templates import weekly_digest
    try:
        from supabase import create_client
        db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        pets_result = db.from_("pets").select("id, name, user_id").execute()
        for pet in (pets_result.data or []):
            logs = db.from_("health_logs").select("id, flagged").eq("pet_id", pet["id"]).gte("logged_at", week_ago).execute()
            log_count = len(logs.data or [])
            flag_count = sum(1 for l in (logs.data or []) if l.get("flagged"))
            if log_count > 0:
                user_result = db.auth.admin.get_user_by_id(pet["user_id"])
                email = user_result.user.email if user_result.user else None
                if email:
                    pet_url = os.environ.get("FRONTEND_URL", "http://localhost:3000") + f"/pets/{pet['id']}"
                    send_email(
                        email,
                        f"PawLog weekly digest — {pet['name']}",
                        weekly_digest(pet["name"], log_count, flag_count, pet_url)
                    )
    except Exception as e:
        print(f"[SCHEDULER weekly_digest] {e}")


async def medication_refill_job():
    """Alert owners when medication ends in 3 days."""
    from email_service import send_email
    from email_templates import medication_refill_alert
    try:
        from supabase import create_client
        db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        in_3_days = (datetime.now(timezone.utc) + timedelta(days=3)).date().isoformat()
        today = datetime.now(timezone.utc).date().isoformat()
        meds = db.from_("medications").select("*, pets(name, id)").eq("active", True).lte("end_date", in_3_days).gte("end_date", today).execute()
        for med in (meds.data or []):
            user_result = db.auth.admin.get_user_by_id(med["user_id"])
            email = user_result.user.email if user_result.user else None
            if email and med.get("pets"):
                pet = med["pets"]
                pet_url = os.environ.get("FRONTEND_URL", "http://localhost:3000") + f"/pets/{pet['id']}/medications"
                send_email(
                    email,
                    f"Medication ending soon: {med['name']} for {pet['name']}",
                    medication_refill_alert(pet["name"], med["name"], med["end_date"], pet_url)
                )
    except Exception as e:
        print(f"[SCHEDULER medication_refill] {e}")


async def appointment_reminder_job():
    """Remind owners 24h before and vets 1h before appointments."""
    from email_service import send_email
    from email_templates import appointment_reminder_owner, appointment_reminder_vet
    try:
        from supabase import create_client
        db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        now = datetime.now(timezone.utc)
        # Owner reminders: 24h window
        owner_window_start = (now + timedelta(hours=23)).isoformat()
        owner_window_end = (now + timedelta(hours=25)).isoformat()
        appts = db.from_("appointments").select("*, pets(name, id)").eq("status", "upcoming").gte("scheduled_at", owner_window_start).lte("scheduled_at", owner_window_end).execute()
        for appt in (appts.data or []):
            user_result = db.auth.admin.get_user_by_id(appt["owner_id"])
            email = user_result.user.email if user_result.user else None
            if email and appt.get("pets"):
                pet_name = appt["pets"]["name"]
                send_email(
                    email,
                    f"Appointment reminder: {pet_name} tomorrow",
                    appointment_reminder_owner(pet_name, appt["scheduled_at"], appt.get("notes", ""), appt.get("notes", ""))
                )
        # Vet reminders: 1h window
        vet_window_start = (now + timedelta(minutes=55)).isoformat()
        vet_window_end = (now + timedelta(minutes=65)).isoformat()
        vet_appts = db.from_("appointments").select("*, pets(name), profiles!appointments_owner_id_fkey(full_name)").eq("status", "upcoming").not_.is_("vet_id", "null").gte("scheduled_at", vet_window_start).lte("scheduled_at", vet_window_end).execute()
        for appt in (vet_appts.data or []):
            if appt.get("vet_id"):
                vet_result = db.auth.admin.get_user_by_id(appt["vet_id"])
                vet_email = vet_result.user.email if vet_result.user else None
                if vet_email and appt.get("pets"):
                    pet_name = appt["pets"]["name"]
                    owner_name = (appt.get("profiles") or {}).get("full_name", "the owner")
                    send_email(
                        vet_email,
                        f"Appointment in 1 hour: {pet_name}",
                        appointment_reminder_vet(pet_name, owner_name, appt["scheduled_at"], appt.get("notes", ""))
                    )
    except Exception as e:
        print(f"[SCHEDULER appointment_reminder] {e}")


async def vaccination_reminder_job():
    """Alert owners when a vaccination is due within 2 weeks."""
    from email_service import send_email
    from email_templates import vaccination_due_reminder
    try:
        from supabase import create_client
        db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        now = datetime.now(timezone.utc)
        today = now.date().isoformat()
        in_14_days = (now + timedelta(days=14)).date().isoformat()
        vaccs = db.from_("vaccinations").select("*, pets(name, id, user_id)").gte("next_due_date", today).lte("next_due_date", in_14_days).execute()
        for vacc in (vaccs.data or []):
            pet = vacc.get("pets") or {}
            user_id = pet.get("user_id")
            if not user_id:
                continue
            user_result = db.auth.admin.get_user_by_id(user_id)
            email = user_result.user.email if user_result.user else None
            if email:
                pet_url = os.environ.get("FRONTEND_URL", "http://localhost:3000") + f"/pets/{pet['id']}"
                send_email(
                    email,
                    f"Vaccination due: {vacc['vaccine_name']} for {pet.get('name', 'your pet')}",
                    vaccination_due_reminder(
                        pet.get("name", "your pet"),
                        vacc["vaccine_name"],
                        vacc.get("next_due_date", ""),
                        pet_url
                    )
                )
    except Exception as e:
        print(f"[SCHEDULER vaccination_reminder] {e}")


async def vet_weekly_digest_job():
    """Send weekly digest of flagged patients to vets every Monday."""
    from email_service import send_email
    from email_templates import vet_weekly_digest
    try:
        from supabase import create_client
        db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

        # Get all vets
        vets_result = db.from_("profiles").select("id, full_name").eq("role", "vet").execute()
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

        for vet in (vets_result.data or []):
            vet_id = vet["id"]
            vet_name = vet.get("full_name") or "Vet"

            # Get all accepted shares for this vet
            shares = db.from_("pet_shares").select("pet_id, pets(name)").eq("vet_id", vet_id).eq("status", "accepted").execute()
            total_patients = len(shares.data or [])
            if total_patients == 0:
                continue

            flagged = []
            for share in (shares.data or []):
                pet_id = share["pet_id"]
                pet_name = (share.get("pets") or {}).get("name", "Unknown")
                logs = db.from_("health_logs").select("id").eq("pet_id", pet_id).eq("flagged", True).gte("logged_at", week_ago).execute()
                flag_count = len(logs.data or [])
                if flag_count > 0:
                    flagged.append({"name": pet_name, "flag_count": flag_count})

            vet_result = db.auth.admin.get_user_by_id(vet_id)
            email = vet_result.user.email if vet_result.user else None
            if email:
                send_email(
                    email,
                    f"PawLog Weekly Digest — {vet_name}",
                    vet_weekly_digest(vet_name, flagged, total_patients, f"{frontend_url}/vet/dashboard")
                )
    except Exception as e:
        print(f"[SCHEDULER vet_weekly_digest] {e}")


def start_scheduler():
    scheduler.add_job(daily_reminder_job, CronTrigger(hour=20, minute=0))
    scheduler.add_job(weekly_digest_job, CronTrigger(day_of_week="sun", hour=8, minute=0))
    scheduler.add_job(vet_weekly_digest_job, CronTrigger(day_of_week="mon", hour=8, minute=0))
    scheduler.add_job(medication_refill_job, CronTrigger(hour=9, minute=0))
    scheduler.add_job(vaccination_reminder_job, CronTrigger(hour=9, minute=30))
    scheduler.add_job(appointment_reminder_job, "interval", minutes=10)
    scheduler.start()
    print("[SCHEDULER] Started: daily reminder 20:00 UTC, weekly owner digest Sun 08:00, vet digest Mon 08:00, medication refill 09:00, vaccination reminder 09:30, appointment reminders every 10min")
