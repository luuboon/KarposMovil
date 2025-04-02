import React from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  TouchableOpacityProps, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  disabled,
  ...rest
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getButtonStyle = () => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      ...styles[size],
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: colors.tint,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: '#A1CEDC',
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.tint,
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: '#F44336',
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    const baseStyle: TextStyle = {
      ...styles.text,
      ...styles[`${size}Text`],
    };

    switch (variant) {
      case 'outline':
        return {
          ...baseStyle,
          color: colors.tint,
        };
      default:
        return {
          ...baseStyle,
          color: variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#333333',
        };
    }
  };

  const buttonStyle = getButtonStyle();
  const buttonTextStyle = getTextStyle();

  return (
    <TouchableOpacity
      style={[
        buttonStyle,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? colors.tint : '#FFFFFF'} 
          size={size === 'small' ? 'small' : 'small'} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <ThemedText style={[buttonTextStyle, textStyle]}>{title}</ThemedText>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  small: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  medium: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  large: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 160,
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
