import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

export default function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className={user ? 'md:pl-64 pt-14 md:pt-0 min-h-screen' : ''}>{children}</main>
    </>
  );
}