import { CreateQuizForm } from '@/components/CreateQuizForm';
import { PageHero } from '@/components/PageHero';

export default function CreatePage() {
  return (
    <div>
      <PageHero
        title="Create quiz"
        subtitle="Add a title and one or more questions (Boolean, Input, or Checkbox)."
        light
      />
      <CreateQuizForm />
    </div>
  );
}
