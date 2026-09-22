import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type ArchetypeSlug,
  getArchetype,
  getArchetypeFromAnswers,
  QUIZ_QUESTIONS,
} from '@/constants/archetypes';
import { StickerArt } from '@/components/StickerArt';

type Props = {
  onComplete: (archetype: ArchetypeSlug) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  errorMessage: string;
};

export function ArchetypeQuiz({ onComplete, onCancel, isSubmitting, errorMessage }: Props) {
  const [answers, setAnswers] = useState<ArchetypeSlug[]>([]);

  function handleAnswer(archetype: ArchetypeSlug) {
    setAnswers((prev) => [...prev, archetype]);
  }

  function handleBack() {
    if (answers.length === 0) {
      onCancel();
      return;
    }
    setAnswers((prev) => prev.slice(0, -1));
  }

  if (answers.length < QUIZ_QUESTIONS.length) {
    const question = QUIZ_QUESTIONS[answers.length];

    return (
      <View style={styles.container}>
        <Text style={styles.eyebrow}>
          Question {answers.length + 1} of {QUIZ_QUESTIONS.length}
        </Text>
        <Text style={styles.prompt}>{question.prompt}</Text>

        <View style={styles.options}>
          {question.options.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => handleAnswer(option.archetype)}
              style={styles.optionButton}>
              <Text style={styles.optionButtonText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const slug = getArchetypeFromAnswers(answers);
  const archetype = getArchetype(slug);

  return (
    <View style={styles.container}>
      <Text style={styles.resultTitle}>You&apos;re a {archetype?.name}</Text>
      <Text style={styles.resultDescription}>{archetype?.description}</Text>

      <View style={styles.stickerPreview}>
        <StickerArt slug={slug} />
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={() => onComplete(slug)}
        style={[styles.primaryButton, isSubmitting && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? 'Creating...' : 'Create Player'}
        </Text>
      </Pressable>

      <Pressable
        disabled={isSubmitting}
        onPress={() => setAnswers([])}
        style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Retake</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  eyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
  },
  prompt: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  options: {
    gap: 12,
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  optionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  resultTitle: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
  },
  resultDescription: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },
  stickerPreview: {
    alignSelf: 'center',
    height: 120,
    width: 120,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
