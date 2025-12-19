"""
Management command to reindex all tutors to the search service.
"""

from django.conf import settings
from django.core.management.base import BaseCommand

import requests

from apps.tutors.models import Tutor
from apps.tutors.serializers import TutorSearchSerializer


class Command(BaseCommand):
    help = "Reindex all tutors to search service"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of tutors to sync per batch",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        tutors = Tutor.objects.select_related("user").all()
        total = tutors.count()
        synced = 0
        failed = 0

        self.stdout.write(f"Starting reindex of {total} tutors...")

        for i in range(0, total, batch_size):
            batch = tutors[i : i + batch_size]
            data = TutorSearchSerializer(batch, many=True).data

            try:
                response = requests.post(
                    f"{settings.SEARCH_SERVICE_URL}/admin/sync",
                    json=data,
                    timeout=60,
                )

                if response.ok:
                    result = response.json()
                    synced += result.get("synced", 0)
                    batch_failed = len(batch) - result.get("synced", 0)
                    failed += batch_failed
                    self.stdout.write(f"Progress: {synced}/{total}")
                else:
                    failed += len(batch)
                    self.stderr.write(f"Batch failed: {response.text}")
            except requests.RequestException as e:
                failed += len(batch)
                self.stderr.write(f"Batch error: {e}")

        if failed > 0:
            self.stdout.write(self.style.WARNING(f"Reindexed {synced} tutors, {failed} failed"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Reindexed {synced} tutors"))
