import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { login, register } from '@/services/auth';

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAuth(mode: 'login' | 'register') {
    if (!name.trim() || !password) {
      setMessage('Enter a name and password.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('');

      await (mode === 'login'
        ? login({ name: name.trim(), password })
        : register({ name: name.trim(), password }));

      router.replace('/profile');
    } catch {
      setMessage(mode === 'login' ? 'Login failed.' : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ONES</Text>
          <Text style={styles.title}>Sign in to your profile</Text>
          <Text style={styles.subtitle}>
            Log in or create a player to get your QR code and start tracking matches.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setName}
            placeholder="Name"
            style={styles.input}
            value={name}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {message ? <Text style={styles.errorText}>{message}</Text> : null}

          <Pressable
            disabled={isLoading}
            onPress={() => handleAuth('login')}
            style={[styles.primaryButton, isLoading && styles.disabledButton]}>
            <Text style={styles.primaryButtonText}>Log In</Text>
          </Pressable>

          <Pressable
            disabled={isLoading}
            onPress={() => handleAuth('register')}
            style={[styles.secondaryButton, isLoading && styles.disabledButton]}>
            <Text style={styles.secondaryButtonText}>Create Player</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    gap: 28,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
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
    minHeight: 52,
    justifyContent: 'center',
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
    minHeight: 52,
    justifyContent: 'center',
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
