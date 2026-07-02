from typing import Dict, Literal, Optional
from uuid import uuid4
from dataclasses import dataclass, field


@dataclass
class Job:
    id: str = field(default_factory=lambda: str(uuid4()))
    status: Literal["processing", "done", "error"] = "processing"
    result: Optional[dict] = None
    error: Optional[str] = None


job_store: Dict[str, Job] = {}


def create_job() -> Job:
    job = Job()
    job_store[job.id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    return job_store.get(job_id)
