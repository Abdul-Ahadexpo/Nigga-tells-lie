import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { ref, set } from 'firebase/database';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { User } from '../types';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

type FormData = z.infer<typeof schema>;

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast.success('Logged in successfully!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(userCredential.user, {
          displayName: data.username,
        });
        
        // Store additional user data
        await set(ref(db, `users/${userCredential.user.uid}`), {
          email: data.email,
          username: data.username,
          uid: userCredential.user.uid,
        });
        
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl p-6">
      <h2 className="text-2xl font-bold mb-4">{isLogin ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            {...register('email')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            {...register('password')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            {...register('username')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
          />
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-purple-600 hover:text-purple-500"
        >
          {isLogin ? 'Sign Up' : 'Login'}
        </button>
      </p>
    </div>
  );
}