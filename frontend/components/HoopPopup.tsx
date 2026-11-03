import { QuestionPopup } from '@/components/QuestionPopup';

// Asks whether the player hooped on `date`. Yes calls onYes; No or a tap outside closes it.
export function HoopPopup({
  date,
  onYes,
  onClose,
}: {
  date: Date | null;
  onYes: (date: Date) => void;
  onClose: () => void;
}) {
  return (
    <QuestionPopup
      onClose={onClose}
      options={[
        { label: 'Yes', onPress: () => date && onYes(date) },
        { label: 'No', onPress: () => {} },
      ]}
      question="U hoop today?"
      visible={date !== null}
    />
  );
}
