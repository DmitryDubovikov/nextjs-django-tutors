"""
Management command to seed the database with test tutor data.
"""

import random

from django.core.management.base import BaseCommand

from faker import Faker

from apps.core.models import User
from apps.tutors.models import Tutor


class Command(BaseCommand):
    """Seed the database with test tutor data."""

    help = "Seeds the database with test tutors"

    SUBJECTS = [
        "math",
        "physics",
        "chemistry",
        "biology",
        "english",
        "german",
        "french",
        "history",
        "geography",
        "computer-science",
        "programming",
        "economics",
        "literature",
        "music",
        "art",
    ]

    HEADLINES = [
        "Experienced {subject} tutor with {years} years of teaching",
        "Passionate {subject} teacher helping students succeed",
        "Professional {subject} instructor for all levels",
        "Expert {subject} coach - from basics to advanced",
        "Dedicated {subject} mentor with proven results",
        "Friendly {subject} tutor specializing in exam prep",
    ]

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--count",
            type=int,
            default=20,
            help="Number of tutors to create (default: 20)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing tutors before seeding",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        fake = Faker()
        count = options["count"]

        if options["clear"]:
            self.stdout.write("Clearing existing tutors...")
            Tutor.objects.all().delete()
            User.objects.filter(user_type=User.UserType.TUTOR).delete()
            self.stdout.write(self.style.SUCCESS("Cleared existing tutors"))

        self.stdout.write(f"Creating {count} tutors...")

        created_count = 0
        for i in range(count):
            # Create user
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"{first_name.lower()}.{last_name.lower()}.{i}"
            email = f"{username}@example.com"

            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                user_type=User.UserType.TUTOR,
                avatar=f"https://i.pravatar.cc/300?u={username}",
                phone=fake.phone_number()[:20],
            )

            # Select 1-4 random subjects
            num_subjects = random.randint(1, 4)
            subjects = random.sample(self.SUBJECTS, num_subjects)
            main_subject = subjects[0].replace("-", " ").title()

            # Generate headline
            headline_template = random.choice(self.HEADLINES)
            headline = headline_template.format(
                subject=main_subject,
                years=random.randint(2, 15),
            )

            # Create tutor profile
            Tutor.objects.create(
                user=user,
                headline=headline,
                bio=self._generate_bio(fake, subjects, main_subject),
                hourly_rate=random.randint(20, 150),
                subjects=subjects,
                is_verified=random.random() > 0.3,
            )

            created_count += 1

            if created_count % 5 == 0:
                self.stdout.write(f"  Created {created_count}/{count} tutors...")

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} tutors"))

    def _generate_bio(self, fake: Faker, subjects: list, main_subject: str) -> str:
        """Generate a realistic bio for a tutor."""
        years = random.randint(2, 15)
        intro = random.choice(
            [
                f"I have been teaching {main_subject} for {years} years.",
                f"With {years} years of experience in {main_subject}, I help students achieve their goals.",
                f"As a passionate {main_subject} educator for over {years} years, I believe everyone can succeed.",
            ]
        )

        approach = random.choice(
            [
                "My teaching approach focuses on building strong fundamentals and developing problem-solving skills.",
                "I create personalized lesson plans tailored to each student's learning style and goals.",
                "I combine traditional teaching methods with modern interactive techniques.",
                "My lessons are designed to be engaging, practical, and focused on real-world applications.",
            ]
        )

        experience = random.choice(
            [
                "I have helped hundreds of students improve their grades and gain confidence.",
                "My students have consistently achieved top scores in exams and competitions.",
                "I specialize in exam preparation and have a proven track record of success.",
                "I work with students of all levels, from beginners to advanced learners.",
            ]
        )

        other_subjects = ", ".join(s.replace("-", " ").title() for s in subjects[1:])
        if other_subjects:
            additional = f" In addition to {main_subject}, I also teach {other_subjects}."
        else:
            additional = ""

        closing = random.choice(
            [
                "Let's work together to achieve your academic goals!",
                "I look forward to helping you succeed!",
                "Contact me to schedule your first lesson!",
                "Book a trial lesson and see the difference!",
            ]
        )

        return f"{intro} {approach} {experience}{additional} {closing}"
