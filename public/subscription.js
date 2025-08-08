// Subscription handling for Carrd integration
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Stripe
  const stripe = Stripe('YOUR_PUBLISHABLE_KEY'); // Replace with your publishable key
  
  // Handle subscription form submission
  const subscriptionForm = document.getElementById('subscription-form');
  if (subscriptionForm) {
    subscriptionForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const email = document.getElementById('email').value;
      const cardElement = elements.getElement(CardElement);
      const productId = document.getElementById('product-id').value;
      const priceId = document.getElementById('price-id').value;
      
      // Create payment method
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      
      if (error) {
        // Show error to customer
        const errorElement = document.getElementById('card-errors');
        errorElement.textContent = error.message;
        return;
      }
      
      // Create subscription on the server
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          paymentMethodId: paymentMethod.id,
          priceId,
          productId
        }),
      });
      
      const subscription = await response.json();
      
      // Complete subscription setup
      const { error: subscriptionError } = await stripe.confirmCardPayment(
        subscription.clientSecret
      );
      
      if (subscriptionError) {
        // Show error to customer
        const errorElement = document.getElementById('card-errors');
        errorElement.textContent = subscriptionError.message;
        return;
      }
      
      // Subscription was successful
      window.location.href = '/thank-you?subscription=' + subscription.subscriptionId;
    });
  }
});