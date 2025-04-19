import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  roomName: z.string().min(3, 'Room name must be at least 3 characters'),
  isPrivate: z.boolean(),
  password: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  onSubmit: (data: FormData) => void;
  onClose: () => void;
};

export function CreateRoomModal({ onSubmit, onClose }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const isPrivate = watch('isPrivate');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-card-foreground">Create New Room</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground">Room Name</label>
            <input
              type="text"
              {...register('roomName')}
              className="mt-1 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring focus:ring-primary/20"
            />
            {errors.roomName && (
              <p className="text-destructive text-sm mt-1">{errors.roomName.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('isPrivate')}
              className="rounded border-input text-primary focus:ring-primary/20"
            />
            <label className="ml-2 block text-sm text-card-foreground">
              Make this room private
            </label>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-card-foreground">Password</label>
              <input
                type="password"
                {...register('password')}
                className="mt-1 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring focus:ring-primary/20"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}