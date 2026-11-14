import { Redirect } from 'expo-router';

// Any unknown address goes back to Home.
export default function NotFound() {
  return <Redirect href="/" />;
}
