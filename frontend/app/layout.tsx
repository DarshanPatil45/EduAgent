import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduAgent-360 — AI-Powered Learning Platform',
  description:
    'EduAgent-360 transforms your study materials into an intelligent learning experience. Chat with your documents, generate flashcards, take adaptive quizzes, and track your mastery.',
  keywords: ['AI learning', 'study assistant', 'flashcards', 'quiz', 'notes', 'education'],
  openGraph: {
    title: 'EduAgent-360',
    description: 'AI-Powered Learning Platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
