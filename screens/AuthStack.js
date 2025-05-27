// AuthStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import VerifyOtpScreen from './VerifyOtpScreen';
import RegisterStep2Screen from './RegisterStep2Screen';
import ResetPasswordScreen from './ResetPasswordScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

const AuthStack = ({ setIsLoggedIn }) => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
        </Stack.Screen>
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
        <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
);

export default AuthStack;
