import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CertificatesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Meus Certificados</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08070D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

