// Script para debug de transferencias
require('dotenv').config({ path: './apps/server/.env' });

const testTransferFlow = async () => {
  console.log('=== DEBUG TRANSFER FLOW ===');
  
  // 1. Verificar variables de entorno
  console.log('1. Variables de entorno:');
  console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Configurada ✓' : 'Falta ✗');
  console.log('   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'Configurada ✓' : 'Falta ✗');
  
  // 2. Verificar cliente Stripe
  try {
    const { getStripeClient, createTransfer } = require('./apps/server/src/utils/stripe');
    const stripe = getStripeClient();
    
    if (!stripe) {
      console.log('2. Cliente Stripe: No configurado ✗');
      return;
    }
    console.log('2. Cliente Stripe: Configurado ✓');
    
    // 3. Buscar un PaymentIntent reciente de prueba
    console.log('3. Buscando PaymentIntent recientes...');
    const intents = await stripe.paymentIntents.list({ limit: 3 });
    
    if (intents.data.length === 0) {
      console.log('   No hay PaymentIntents ℹ️');
      return;
    }
    
    const lastIntent = intents.data[0];
    console.log(`   Último PaymentIntent: ${lastIntent.id} (${lastIntent.status})`);
    
    // 4. Buscar Checkout Session asociado
    console.log('4. Buscando Checkout Session...');
    const sessions = await stripe.checkout.sessions.list({ 
      payment_intent: lastIntent.id, 
      limit: 1 
    });
    
    if (sessions.data.length === 0) {
      console.log('   No hay Checkout Session asociado ℹ️');
      return;
    }
    
    const session = sessions.data[0];
    console.log(`   Checkout Session: ${session.id}`);
    
    // 5. Simular búsqueda de cliente en Strapi (necesita instancia de Strapi)
    console.log('5. Para verificar datos del cliente, ejecuta el webhook real o revisa logs del servidor');
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Inicia el servidor: pnpm --filter server dev');
    console.log('2. En otra terminal: stripe listen --forward-to http://localhost:1337/api/stripe/webhook');
    console.log('3. Trigger: stripe trigger payment_intent.succeeded');
    console.log('4. Revisa logs del servidor para ver el flujo completo');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testTransferFlow().catch(console.error);