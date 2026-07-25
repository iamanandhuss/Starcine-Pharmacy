import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const channel = supabase.channel('driver_tracking_channel');

channel.on('broadcast', { event: 'location_update' }, (payload) => {
  console.log('Received payload:', payload);
});

channel.subscribe(async (status) => {
  console.log('Subscription status:', status);
  if (status === 'SUBSCRIBED') {
    console.log('Sending test broadcast...');
    const res = await channel.send({
      type: 'broadcast',
      event: 'location_update',
      payload: { driverId: 'test', latitude: 13, longitude: 80 }
    });
    console.log('Broadcast send result:', res);
    
    setTimeout(() => {
      console.log('Exiting...');
      process.exit(0);
    }, 2000);
  }
});
