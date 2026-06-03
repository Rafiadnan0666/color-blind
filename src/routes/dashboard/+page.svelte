<script>
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let initials = $state('');

  $effect(() => {
    if ($user?.email) {
      initials = $user.email[0].toUpperCase();
    }
  });

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }
</script>

<div class="min-h-[calc(100vh-8rem)] bg-neo-white">
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="brut-card mb-8 bg-gradient-to-r from-blue-100 to-purple-100 border-3 border-neo-black">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="brut-heading text-brut-4xl mb-2">{getGreeting()}, {$user?.email || 'User'}!</h1>
          <p class="font-brut text-brut-sm text-neo-darkgray uppercase tracking-wider">
            Welcome back to your color blindness detection dashboard
          </p>
        </div>
        <div class="brut-avatar w-20 h-20 text-brut-lg flex items-center justify-center bg-yellow-300 border-3 border-neo-black">
          {initials}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <div class="brut-card border-3 border-neo-black bg-cyan-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-eye text-blue-600 mr-2"></i> New Detection
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Detect and analyze objects & colors
            </p>
          </div>
        </div>
        <a href="/detects" class="brut-btn-primary inline-block mt-4">
          Start Detecting
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-purple-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-file-lines text-purple-600 mr-2"></i> OCR Scanner
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Extract text from images
            </p>
          </div>
        </div>
        <a href="/ocr" class="brut-btn inline-block mt-4">
          Open OCR
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-teal-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-robot text-teal-600 mr-2"></i> AI Assistant
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Ask about colors, detection & accessibility
            </p>
          </div>
        </div>
        <a href="/assistant" class="brut-btn inline-block mt-4">
          Chat Now
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-pink-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-history text-pink-600 mr-2"></i> Detection History
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              View your previous scans
            </p>
          </div>
        </div>
        <a href="/history" class="brut-btn inline-block mt-4">
          View History
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-green-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-palette text-green-600 mr-2"></i> Saved Colors
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Browse your saved color palette
            </p>
          </div>
        </div>
        <a href="/saved-colors" class="brut-btn inline-block mt-4">
          View Colors
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-orange-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-cog text-orange-600 mr-2"></i> Account Settings
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Profile, notifications & preferences
            </p>
          </div>
        </div>
        <a href="/profile" class="brut-btn inline-block mt-4">
          Settings
        </a>
      </div>
    </div>

    <div class="brut-card border-3 border-neo-black bg-yellow-100">
      <h2 class="brut-heading text-brut-2xl mb-4">
        <i class="fas fa-lightbulb text-yellow-600 mr-2"></i> About Color Blindness Detection
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="font-brut font-bold text-brut-lg mb-2 uppercase">What We Do</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Our advanced machine learning algorithms analyze images to detect patterns indicative of color vision deficiencies. We help you understand and improve accessibility for all users.
          </p>
        </div>
        <div>
          <h3 class="font-brut font-bold text-brut-lg mb-2 uppercase">Why It Matters</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Approximately 1 in 12 men and 1 in 200 women have color blindness. Making your designs accessible ensures everyone can enjoy your content equally.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
