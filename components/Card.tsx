import React from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

interface CardProps extends TouchableOpacityProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: number;
  borderRadius?: number;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  style,
  onPress,
  elevation = 2,
  borderRadius = 8,
  padding = 16,
  ...rest
}) => {
  const cardContent = (
    <ThemedView
      style={[
        styles.container,
        {
          borderRadius,
          padding,
          shadowOpacity: elevation * 0.05,
          elevation,
        },
        style,
      ]}
    >
      {(title || subtitle) && (
        <ThemedView style={styles.header}>
          {title && <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>}
          {subtitle && <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>}
        </ThemedView>
      )}
      <ThemedView style={styles.content}>{children}</ThemedView>
    </ThemedView>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} {...rest}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
});
