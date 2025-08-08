import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, CheckCircle, XCircle, ArrowLeft, Shield } from 'lucide-react';
import { analyticsService } from '../utils/analyticsService';
import { environment } from '../config/environment';

// Initialize Stripe with a test publishable key
const stripePromise = loadStripe(environment.stripePublishableKey);

interface PaymentScreenProps {
  onBack: () => void;
  onPaymentComplete: (licenseKey: string) => void;
  selectedPlan: 'single' | 'pro' | 'family' | 'business';
}

// Main payment screen component
export const PaymentScreen: React.FC<PaymentScreenProps> = ({ 
  onBack, 
  onPaymentComplete,
  selectedPlan 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: '#0f172a' }}>
      <div className="max-w-md w-full my-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', outline: 'none' }}>
            <CreditCard className="w-8 h-8 text-white" style={{ filter: 'none', backgroundColor: 'transparent', boxShadow: 'none', border: 'none', outline: 'none' }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Complete Your Purchase</h1>
          <p className="text-slate-400">
            {selectedPlan === 'single' && 'Single User License - $29.99'}
            {selectedPlan === 'family' && 'Family Plan - $49.99'}
            {selectedPlan === 'business' && 'Business License - $99.99'}
          </p>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm 
            onBack={onBack} 
            onPaymentComplete={onPaymentComplete} 
            selectedPlan={selectedPlan}
          />
        </Elements>
      </div>
    </div>
  );
};

// Checkout form component
const CheckoutForm: React.FC<PaymentScreenProps> = ({ 
  onBack, 
  onPaymentComplete,
  selectedPlan 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');

  // Get price based on selected plan
  const getPrice = () => {
    switch (selectedPlan) {
      case 'single': return 29.99;
      case 'pro': return 68.00;
      case 'family': return 49.99;
      case 'business': return 99.99;
      default: return 29.99;
    }
  };

  // Generate a license key
  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // Generate 15 random characters
    for (let i = 0; i < 15; i++) {
      if (i > 0 && i % 4 === 0) {
        result += '-';
      }
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Add checksum
    let checksum = 0;
    const cleanKey = result.replace(/-/g, '');
    for (let i = 0; i < cleanKey.length; i++) {
      checksum += cleanKey.charCodeAt(i);
    }
    result += (checksum % 36).toString(36).toUpperCase();
    
    return result;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Track payment attempt
      analyticsService.trackUserAction('payment_attempt', {
        plan: selectedPlan,
        price: getPrice(),
        environment: environment.isTest ? 'test' : 'production'
      });

      // In a real implementation, you would:
      // 1. Create a payment intent on your server
      // 2. Confirm the payment with Stripe
      // 3. Generate and store the license key on your server
      
      // For demo purposes, we'll simulate a successful payment
      // and generate a license key locally
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a license key
      const newLicenseKey = generateLicenseKey();
      setLicenseKey(newLicenseKey);
      
      // Track successful payment
      analyticsService.trackUserAction('payment_success', {
        plan: selectedPlan,
        price: getPrice(),
        environment: environment.isTest ? 'test' : 'production'
      });
      
      setPaymentSuccess(true);
      
      // In a real implementation, you would wait for webhook confirmation
      // before showing success and generating the license key
      
    } catch (error) {
      setPaymentError((error as Error).message || 'An error occurred during payment processing');
      
      // Track payment failure
      analyticsService.trackUserAction('payment_failure', {
        plan: selectedPlan,
        error: (error as Error).message,
        environment: environment.isTest ? 'test' : 'production'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteCheckout = () => {
    onPaymentComplete(licenseKey);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
      {!paymentSuccess ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="your.email@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="John Smith"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Card Details
            </label>
            <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#FFFFFF',
                      '::placeholder': {
                        color: '#94A3B8',
                      },
                    },
                    invalid: {
                      color: '#EF4444',
                    },
                  },
                }}
              />
            </div>
          </div>
          
          {paymentError && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm">{paymentError}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Pay ${getPrice().toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
          
          <div className="text-center pt-4">
            <p className="text-xs text-slate-400">
              Your payment is secure. We use Stripe for secure payment processing.
            </p>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Payment Successful!</h2>
            <p className="text-slate-400 mb-4">Thank you for your purchase.</p>
          </div>
          
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <p className="text-sm text-slate-300 mb-2">Your License Key:</p>
            <div className="bg-slate-800 p-3 rounded font-mono text-blue-400 text-center select-all">
              {licenseKey}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Please save this key. It will also be emailed to you.
            </p>
          </div>
          
          <button
            onClick={handleCompleteCheckout}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Continue to Password Vault</span>
          </button>
        </div>
      )}
    </div>
  );
};