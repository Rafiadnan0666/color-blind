<script>
  import { session } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
</script>


<div class="min-h-screen bg-gradient-to-br from-neo-white via-blue-50 to-purple-50 flex items-center justify-center px-4">
  <div class="max-w-4xl mx-auto text-center">
    
    <div class="brut-card border-4 border-neo-black bg-yellow-100 mb-8 inline-block">
      <h1 class="brut-heading text-brut-5xl uppercase tracking-tighter">
        <i class="fas fa-eye text-blue-600 mr-3"></i>Color Blind<i class="fas fa-lightbulb text-yellow-500 ml-3"></i>
      </h1>
    </div>

    <p class="font-brut text-brut-lg uppercase tracking-wide text-neo-darkgray mb-8 max-w-2xl mx-auto">
      Advanced AI-powered color blindness detection to build truly accessible designs
    </p>

    
    {#if $session}
      <a href="/dashboard" class="brut-btn-primary text-brut-lg px-8 py-4 inline-block">
        Go to Dashboard
      </a>
    {:else}
      <div class="flex gap-4 justify-center flex-wrap">
        <a href="/auth/login" class="brut-btn-primary text-brut-lg px-8 py-4">
          Sign In
        </a>
        <a href="/auth/register" class="brut-btn text-brut-lg px-8 py-4">
          Sign Up
        </a>
      </div>
    {/if}
  </div>
</div>


<div class="bg-neo-white py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 class="brut-heading text-brut-4xl text-center mb-16 uppercase">Why Choose ClrBlind?</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      <div class="brut-card border-3 border-neo-black bg-cyan-100 hover:shadow-brut-lg transition-all">
        <div class="text-brut-4xl mb-4">
          <i class="fas fa-robot text-cyan-600"></i>
        </div>
        <h3 class="brut-heading text-brut-2xl mb-3 uppercase">AI Powered</h3>
        <p class="font-brut text-brut-sm text-neo-darkgray">
          Machine learning algorithms trained on thousands of images for accurate detection
        </p>
      </div>

      
      <div class="brut-card border-3 border-neo-black bg-pink-100 hover:shadow-brut-lg transition-all">
        <div class="text-brut-4xl mb-4">
          <i class="fas fa-bolt text-pink-600"></i>
        </div>
        <h3 class="brut-heading text-brut-2xl mb-3 uppercase">Lightning Fast</h3>
        <p class="font-brut text-brut-sm text-neo-darkgray">
          Browser-based processing means instant results without uploading to servers
        </p>
      </div>

      
      <div class="brut-card border-3 border-neo-black bg-green-100 hover:shadow-brut-lg transition-all">
        <div class="text-brut-4xl mb-4">
          <i class="fas fa-shield-alt text-green-600"></i>
        </div>
        <h3 class="brut-heading text-brut-2xl mb-3 uppercase">Privacy First</h3>
        <p class="font-brut text-brut-sm text-neo-darkgray">
          Your images never leave your browser. Complete privacy protection
        </p>
      </div>
    </div>
  </div>
</div>


<div class="bg-gradient-to-r from-purple-100 to-blue-100 py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 class="brut-heading text-brut-4xl text-center mb-16 uppercase">About Color Blindness</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      <div class="brut-card border-3 border-neo-black bg-yellow-100">
        <h3 class="brut-heading text-brut-2xl mb-4 uppercase">
          <i class="fas fa-users text-yellow-600 mr-2"></i>The Numbers
        </h3>
        <p class="font-brut text-brut-lg mb-3">
          <strong>1 in 12 men</strong> and <strong>1 in 200 women</strong> have some form of color blindness
        </p>
        <p class="font-brut text-brut-sm text-neo-darkgray">
          That's over 300 million people worldwide who rely on accessible design
        </p>
      </div>

      
      <div class="brut-card border-3 border-neo-black bg-orange-100">
        <h3 class="brut-heading text-brut-2xl mb-4 uppercase">
          <i class="fas fa-palette text-orange-600 mr-2"></i>Common Types
        </h3>
        <ul class="font-brut text-brut-sm text-neo-darkgray space-y-2">
          <li><strong>Protanopia:</strong> Red/green color blindness</li>
          <li><strong>Deuteranopia:</strong> Green/red color blindness</li>
          <li><strong>Tritanopia:</strong> Blue/yellow color blindness</li>
        </ul>
      </div>
    </div>
  </div>
</div>


<div class="bg-neo-white py-20 px-4">
  <div class="max-w-4xl mx-auto">
    <h2 class="brut-heading text-brut-4xl text-center mb-16 uppercase">How It Works</h2>

    <div class="space-y-6">
      <div class="brut-card border-3 border-neo-black bg-blue-100 flex items-start gap-6">
        <div class="text-brut-4xl shrink-0">
          <i class="fas fa-upload text-blue-600"></i>
        </div>
        <div>
          <h3 class="brut-heading text-brut-2xl mb-2 uppercase">1. Upload Image Or Scan Surroundings</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Select any image from your device. Supports PNG, JPG, and WebP formats
          </p>
        </div>
      </div>

      <div class="brut-card border-3 border-neo-black bg-green-100 flex items-start gap-6">
        <div class="text-brut-4xl shrink-0">
          <i class="fas fa-cogs text-green-600"></i>
        </div>
        <div>
          <h3 class="brut-heading text-brut-2xl mb-2 uppercase">2. Analysis</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Our AI analyzes color contrast, saturation, and patterns in real-time
          </p>
        </div>
      </div>

      <div class="brut-card border-3 border-neo-black bg-pink-100 flex items-start gap-6">
        <div class="text-brut-4xl shrink-0">
          <i class="fas fa-chart-bar text-pink-600"></i>
        </div>
        <div>
          <h3 class="brut-heading text-brut-2xl mb-2 uppercase">3. Results</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Get detailed insights and recommendations to improve accessibility
          </p>
        </div>
      </div>
    </div>
  </div>
</div>


<div class="bg-gradient-to-r from-cyan-100 to-blue-100 py-20 px-4 text-center border-t-4 border-neo-black">
  <div class="max-w-2xl mx-auto">
    <h2 class="brut-heading text-brut-4xl mb-4 uppercase">Ready to Begin?</h2>
    <p class="font-brut text-brut-sm text-neo-darkgray uppercase mb-8">
      Start detecting color blindness patterns and create truly accessible designs
    </p>
    {#if $session}
      <a href="/dashboard" class="brut-btn-primary text-brut-lg px-8 py-4 inline-block">
        Go to Dashboard
      </a>
    {:else}
      <a href="/auth/register" class="brut-btn-primary text-brut-lg px-8 py-4 inline-block">
        Get Started Free
      </a>
    {/if}
  </div>
</div>
