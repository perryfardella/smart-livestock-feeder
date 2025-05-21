import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Clock, Zap } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Waitlist CTA */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            SmartFeeder
          </h1>
          <p className="mt-4 text-xl text-gray-700 max-w-2xl mx-auto mb-10">
            Take the stress out of animal care. SmartFeeder lets you monitor,
            schedule, and control your feeders from anywhere—giving you peace of
            mind and more time for what matters. Perfect for hobby farmers and
            property owners who want to ensure their animals are always fed and
            happy, even when life gets busy.
          </p>
          <div className="bg-white/80 rounded-xl shadow-lg p-6 sm:p-8 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join the Waitlist
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Be the first to know when we launch and get exclusive early
              access.
            </p>
            <form className="flex flex-col sm:flex-row gap-4">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1"
                required
              />
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4"
              >
                Join Waitlist
              </Button>
            </form>
            <p className="mt-4 text-sm text-gray-500">
              We&apos;ll never share your email with anyone else.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to manage your feeders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=2070"
                    alt="Sheep in a field, Australian livestock"
                    fill
                    className="object-cover"
                  />
                </div>
                <Camera className="h-8 w-8 text-blue-600 mb-4" />
                <CardTitle>Live Monitoring</CardTitle>
                <CardDescription>
                  View your animals and feeders in real-time with our camera
                  integration
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2070"
                    alt="Farm animals feeding"
                    fill
                    className="object-cover"
                  />
                </div>
                <Clock className="h-8 w-8 text-blue-600 mb-4" />
                <CardTitle>Smart Scheduling</CardTitle>
                <CardDescription>
                  Set up automatic feeding schedules that work around your
                  routine
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1546445317-29f4545e9d53?q=80&w=2070"
                    alt="Happy farm animals"
                    fill
                    className="object-cover"
                  />
                </div>
                <Zap className="h-8 w-8 text-blue-600 mb-4" />
                <CardTitle>Instant Control</CardTitle>
                <CardDescription>
                  Manually release feed or adjust settings from anywhere
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
