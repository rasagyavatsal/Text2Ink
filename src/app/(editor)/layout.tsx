import type { ReactNode } from 'react';
import {
  Architects_Daughter,
  Caveat,
  Homemade_Apple,
  Indie_Flower,
  Kalam,
  Patrick_Hand,
  Satisfy,
  Shadows_Into_Light,
} from 'next/font/google';

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const indieFlower = Indie_Flower({
  variable: '--font-indie-flower',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: '--font-shadows-into-light',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const kalam = Kalam({
  variable: '--font-kalam',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
});

const patrickHand = Patrick_Hand({
  variable: '--font-patrick-hand',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const architectsDaughter = Architects_Daughter({
  variable: '--font-architects-daughter',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const satisfy = Satisfy({
  variable: '--font-satisfy',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const homemadeApple = Homemade_Apple({
  variable: '--font-homemade-apple',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

const editorFontVariables = [
  caveat.variable,
  indieFlower.variable,
  shadowsIntoLight.variable,
  kalam.variable,
  patrickHand.variable,
  architectsDaughter.variable,
  satisfy.variable,
  homemadeApple.variable,
].join(' ');

export default function EditorLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className={editorFontVariables}>
      {children}
    </div>
  );
}
