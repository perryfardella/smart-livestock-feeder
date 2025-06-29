import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Camera,
  Clock,
  Zap,
  Shield,
  Users,
  Award,
  CheckCircle,
  Star,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Clear Value Prop & CTA */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Never Worry About Feeding Your Animals Again
          </h1>
          <p className="mt-4 text-xl text-gray-700 max-w-3xl mx-auto mb-10">
            SmartFeeder gives hobby farmers and property owners complete peace
            of mind. Monitor, schedule, and control your animal feeders
            remotely—so your livestock are always fed and happy, even when life
            gets busy.
          </p>
          <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 max-w-xl mx-auto border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join 200+ Hobby Farmers on Our Waitlist
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Be the first to get early access when we launch in October 2025
            </p>
            <div className="flex justify-center mb-4">
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4 shadow-lg"
              >
                <a
                  href="https://tally.so/r/3Ny9BN"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Waitlist - It&apos;s Free
                </a>
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              ✅ Early bird pricing ✅ No spam, ever ✅ Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-b">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Trusted by Australian hobby farmers and property owners
            </p>
          </div>
          <div className="flex justify-center items-center space-x-12 opacity-60">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Secure & Reliable
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                200+ Early Adopters
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Built for Australia
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statements Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Managing Animals Shouldn&apos;t Be This Stressful
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every hobby farmer faces these daily challenges that turn animal
              care into constant worry.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">😰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Constant Worry When Away
              </h3>
              <p className="text-gray-600">
                Whether at work or on vacation, you&apos;re always wondering:
                &quot;Did I feed them enough? Are they okay? What if something
                goes wrong?&quot;
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Rigid Feeding Schedules
              </h3>
              <p className="text-gray-600">
                Your entire day revolves around feeding times. Miss a schedule
                and you feel guilty, knowing your animals depend on you
                completely.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏃</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Emergency Trips Home
              </h3>
              <p className="text-gray-600">
                Leaving work early or cutting trips short because you realized
                the animals need feeding. Your schedule is never truly your own.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What If You Could Feed Your Animals From Anywhere?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              SmartFeeder transforms your smartphone into a remote control for
              your animal feeders, giving you complete freedom and peace of
              mind.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Feed From Your Office
              </h3>
              <p className="text-gray-600">
                Stuck in a meeting? No problem. Release feed with one tap and
                watch your animals eat through the live camera feed.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Set It and Forget It
              </h3>
              <p className="text-gray-600">
                Create automatic feeding schedules that work around YOUR life.
                The system handles feeding while you focus on what matters.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Enjoy Your Freedom
              </h3>
              <p className="text-gray-600">
                Go on vacation knowing your animals are fed on schedule. Get
                alerts if anything needs attention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple Setup, Instant Peace of Mind
            </h2>
            <p className="text-lg text-gray-600">
              Get up and running in minutes with our easy 3-step process.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Connect Your Feeder
              </h3>
              <p className="text-gray-600">
                Simply connect your SmartFeeder device to your WiFi. Our app
                guides you through the easy setup process.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Set Your Schedule
              </h3>
              <p className="text-gray-600">
                Create feeding schedules that match your animals&apos; needs.
                Daily, weekly, or custom patterns—you decide.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Monitor & Control
              </h3>
              <p className="text-gray-600">
                Watch live feeds, trigger manual feedings, and get alerts.
                Complete control from anywhere in the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (Value Proposition) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Everything You Need to Manage Your Feeders
          </h2>
          <p className="text-lg text-gray-600 text-center mb-16 max-w-2xl mx-auto">
            Built specifically for Australian hobby farmers who want reliable,
            simple animal care automation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=2070"
                    alt="Live monitoring of Australian livestock"
                    width={800}
                    height={600}
                    priority={true}
                    className="object-cover"
                  />
                </div>
                <Camera className="h-8 w-8 text-blue-600 mb-4" />
                <CardTitle className="text-xl">Live Monitoring</CardTitle>
                <CardDescription className="text-base">
                  See your animals in real-time with HD camera feeds. Know
                  instantly when they&apos;re feeding and monitor their behavior
                  from anywhere.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2070"
                    alt="Smart automated feeding schedules"
                    width={800}
                    height={600}
                    loading="lazy"
                    className="object-cover"
                  />
                </div>
                <Clock className="h-8 w-8 text-blue-600 mb-4" />
                <CardTitle className="text-xl">Smart Scheduling</CardTitle>
                <CardDescription className="text-base">
                  Create flexible feeding schedules that adapt to your routine.
                  Automatic feeding means no more rushed trips home or missed
                  feeding times.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?q=80&w=2070"
                    alt="Instant remote control of feeders"
                    width={800}
                    height={600}
                    loading="lazy"
                    className="object-cover"
                  />
                </div>
                <Zap className="h-8 w-8 text-blue-600 mb-4" />
                <CardTitle className="text-xl">Instant Control</CardTitle>
                <CardDescription className="text-base">
                  Feed your animals with one tap from your phone. Override
                  schedules, adjust portions, or feed on-demand—complete control
                  at your fingertips.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What Early Users Are Saying
            </h2>
            <p className="text-lg text-gray-600">
              Join hobby farmers who are already excited about SmartFeeder.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <CardDescription className="text-base italic text-gray-700 mb-4">
                  &quot;Finally, a solution for people like me who work in the
                  city but have animals on weekends. I can&apos;t wait to stop
                  worrying about feeding schedules!&quot;
                </CardDescription>
                <div className="flex items-center">
                  <div>
                    <p className="font-semibold text-gray-900">John M.</p>
                    <p className="text-sm text-gray-600">Hobby farmer, NSW</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <CardDescription className="text-base italic text-gray-700 mb-4">
                  &quot;This is exactly what I need for my goats. The camera
                  feature will let me check on them when I&apos;m traveling.
                  Sign me up!&quot;
                </CardDescription>
                <div className="flex items-center">
                  <div>
                    <p className="font-semibold text-gray-900">Sarah K.</p>
                    <p className="text-sm text-gray-600">Property owner, VIC</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Re-Offer Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Animal Care?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join 200+ hobby farmers getting early access to SmartFeeder. Launch
            is October 2025—don&apos;t miss out on early bird pricing.
          </p>
          <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 max-w-xl mx-auto">
            <div className="flex justify-center mb-4">
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4 shadow-lg"
              >
                <a
                  href="https://tally.so/r/3Ny9BN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2"
                >
                  <span>Join the Waitlist Now</span>
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              ✅ Free to join ✅ Early bird pricing ✅ Cancel anytime
            </p>
          </div>
          <p className="text-blue-100 mt-6 text-sm">
            Questions? Email us at hello@smartfeeder.com.au
          </p>
        </div>
      </section>
    </div>
  );
}
