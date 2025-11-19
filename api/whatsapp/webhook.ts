import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/whatsapp/webhook
 *
 * WhatsApp webhook endpoint for receiving messages and notifications
 *
 * GET /api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
 *
 * WhatsApp webhook verification endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle webhook verification (GET request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WhatsApp webhook verified');
      return res.status(200).send(challenge);
    }

    return res.status(403).json({ error: 'Verification failed' });
  }

  // Handle webhook events (POST request)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Validate webhook signature (optional but recommended)
      // const signature = req.headers['x-hub-signature-256'];
      // if (!validateSignature(body, signature)) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }

      // Process WhatsApp events
      if (body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.value?.messages) {
                await processMessages(change.value.messages);
              }

              if (change.value?.statuses) {
                await processStatuses(change.value.statuses);
              }
            }
          }
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('WhatsApp webhook error:', error);

      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      return res.status(500).json({ error: message });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Process incoming WhatsApp messages
 */
async function processMessages(messages: any[]) {
  for (const message of messages) {
    const { from, text, type } = message;

    console.log('Processing WhatsApp message:', { from, type });

    // Log event for IRIS Prime (using evaluateProject as proxy for now)
    // You may want to add a proper logEvent method to irisPrime
    console.log('WhatsApp message event:', {
      from,
      type,
      text: text?.body,
      timestamp: new Date().toISOString(),
    });

    // Process message based on type
    if (type === 'text' && text?.body) {
      await handleTextMessage(from, text.body);
    }
  }
}

/**
 * Process WhatsApp message statuses (delivered, read, etc.)
 */
async function processStatuses(statuses: any[]) {
  for (const status of statuses) {
    console.log('WhatsApp status update:', status);
    // Handle status updates if needed
  }
}

/**
 * Handle text message commands
 */
async function handleTextMessage(from: string, text: string) {
  const command = text.toLowerCase().trim();

  // Example command handling
  if (command === 'status') {
    // Send IRIS Prime status
    await sendWhatsAppMessage(from, 'IRIS Prime is operational');
  } else if (command.startsWith('evaluate')) {
    // Trigger evaluation
    await sendWhatsAppMessage(from, 'Starting evaluation...');
  }
}

/**
 * Send WhatsApp message via WhatsApp Business API
 */
async function sendWhatsAppMessage(to: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('WhatsApp access token not configured');
    return;
  }

  // Implementation would use WhatsApp Business API
  console.log('Sending WhatsApp message:', { to, text });
}
