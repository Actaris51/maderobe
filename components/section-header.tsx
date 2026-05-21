import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

type Props = {
  title: string;
  subtitle?: string;
  required?: boolean;
};

export function SectionHeader({ title, subtitle, required }: Props) {
  return (
    <>
      <ThemedText style={styles.title}>
        {title}
        {required ? <ThemedText style={styles.required}> *</ThemedText> : null}
      </ThemedText>
      {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 12,
  },
  required: {
    color: '#e74c3c',
  },
});
