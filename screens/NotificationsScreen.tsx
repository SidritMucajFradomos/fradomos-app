import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://api.fradomos.al:3000';

export default function NotificationsScreen() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvites() {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('User not authenticated');

        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        const res = await axios.get(`${API_URL}/home-invites/user/${userId}`);
        setInvites(res.data);
      } catch (error: any) {
        Alert.alert('Error fetching invites', error.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadInvites();
  }, []);

  const handleRespond = async (id: number, accept: boolean) => {
    try {
      await axios.put(`${API_URL}/home-invites/${id}`, {
        status: accept ? 'accepted' : 'declined',
      });
      // Remove the invite from the list
      setInvites((prev) => prev.filter((invite) => invite.id !== id));

      Alert.alert('Success', `Invite ${accept ? 'accepted' : 'declined'}`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to respond to the invite');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!invites.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>No pending invitations.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={invites}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.inviteCard}>
            <Text style={styles.text}>
              <Text style={{ fontWeight: 'bold' }}>
                {item.invited_by_first_name} {item.invited_by_last_name}
              </Text>{' '}
              invited you to <Text style={{ fontWeight: 'bold' }}>{item.house_name}</Text>
            </Text>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={() => handleRespond(item.id, true)}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={() => handleRespond(item.id, false)}
              >
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inviteCard: {
    padding: 16,
    marginBottom: 15,
    marginTop: 20,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  text: {
    fontSize: 18,
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#4caf50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
