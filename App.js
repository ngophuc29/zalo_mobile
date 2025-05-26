// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput, Platform, SafeAreaView, StatusBar } from 'react-native';
import { validateFontSize } from './utils/fontScaling';
import { FontAwesome } from '@expo/vector-icons';

import AuthStack from './screens/AuthStack';
import ChatScreen from './screens/ChatScreen';
import ContactsScreen from './screens/ContactsScreen';
import UserScreen from './screens/UserScreen';
import Toast from 'react-native-toast-message';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Override default Text component to ensure font sizes are valid
const originalTextRender = Text.render;
Text.render = function (...args) {
  const originResult = originalTextRender.call(this, ...args);
  if (!originResult) return originResult;

  const elementStyle = originResult.props.style || {};
  if (elementStyle.fontSize) {
    elementStyle.fontSize = validateFontSize(elementStyle.fontSize);
  }
  
  return React.cloneElement(originResult, {
    style: elementStyle,
    allowFontScaling: false, // Prevent system font scaling from affecting the app
  });
};

// Prevent font scaling on TextInput as well
if (Platform.OS === 'android') {
  const originalTextInputRender = TextInput.render;
  TextInput.render = function (...args) {
    const originResult = originalTextInputRender.call(this, ...args);
    if (!originResult) return originResult;
    
    return React.cloneElement(originResult, {
      allowFontScaling: false,
    });
  };
}

const BottomTabs = ({ setIsLoggedIn }) => {
  const [tabRefreshKey, setTabRefreshKey] = useState({ Chat: 0, Contacts: 0, User: 0 });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Chat') {
            iconName = 'comments';
          } else if (route.name === 'Contacts') {
            iconName = 'users';
          } else if (route.name === 'User') {
            iconName = 'user';
          }
          return <FontAwesome name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        },
      })}
    >
      <Tab.Screen
        name="Chat"
        children={props => <ChatScreen {...props} forceRefresh={tabRefreshKey.Chat} />}
        listeners={{
          focus: () => setTabRefreshKey(k => ({ ...k, Chat: Date.now() }))
        }}
      />
      <Tab.Screen
        name="Contacts"
        children={props => <ContactsScreen {...props} forceRefresh={tabRefreshKey.Contacts} />}
        listeners={{
          focus: () => setTabRefreshKey(k => ({ ...k, Contacts: Date.now() }))
        }}
      />
      <Tab.Screen
        name="User"
        children={props => <UserScreen {...props} setIsLoggedIn={setIsLoggedIn} forceRefresh={tabRefreshKey.User} />}
        listeners={{
          focus: () => setTabRefreshKey(k => ({ ...k, User: Date.now() }))
        }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsLoggedIn(!!user?.username);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Lỗi kiểm tra login:', error);
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (isLoggedIn === null) return null; // loading

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <Stack.Screen name="Main">
              {(props) => <BottomTabs {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Auth">
              {(props) => <AuthStack {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </SafeAreaView>
  );
}
