"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Upload, ExternalLink, Copy, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function CreatePage() {
  const [formData, setFormData] = useState({
    projectName: "",
    coinTicker: "",
    description: "",
    website: "",
    telegram: "",
    twitter: "",
    lockOption: "no-lock",
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-white font-bold text-2xl tracking-tight">BLITZ</h1>
            </Link>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>Trade</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>Earn</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <Link href="/" className="text-blue-400 font-medium">
                Launchpad
              </Link>
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>Bridge</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>More</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </Button>
              <div className="px-3 py-1 bg-white/5 rounded-lg text-white/80 text-sm font-mono">0xbcff...1246</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Form Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="sm" asChild className="text-white/60 hover:text-white hover:bg-white/10">
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-white leading-none tracking-tighter">
                Create New
                <br />
                <span className="text-blue-500">Meme Coin</span>
              </h1>
              <p className="text-xl text-white/80 leading-relaxed font-light">
                Launch your token with our professional platform and built-in security features.
              </p>
            </div>

            <div className="space-y-8">
              {/* Avatar Upload */}
              <div className="space-y-4">
                <Label className="text-white font-semibold text-base tracking-tight">Token Avatar</Label>
                <p className="text-white/60 text-sm">Upload an image for your token (Max 1MB)</p>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center bg-white/5 backdrop-blur-sm relative overflow-hidden hover:border-blue-500/50 transition-colors">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview || "/placeholder.svg"}
                        alt="Avatar preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-white/40" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Project Name */}
              <div className="space-y-3">
                <Label className="text-white font-semibold text-base tracking-tight">Project Name</Label>
                <Input
                  placeholder="Enter your project name"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange("projectName", e.target.value)}
                  className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-white/40 rounded-xl h-12 focus:border-blue-500/50"
                />
              </div>

              {/* Coin Ticker */}
              <div className="space-y-3">
                <Label className="text-white font-semibold text-base tracking-tight">Token Symbol</Label>
                <Input
                  placeholder="e.g., MEME"
                  value={formData.coinTicker}
                  onChange={(e) => handleInputChange("coinTicker", e.target.value)}
                  className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-white/40 rounded-xl h-12 focus:border-blue-500/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label className="text-white font-semibold text-base tracking-tight">Description</Label>
                <Textarea
                  placeholder="Describe your token and its purpose..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-white/40 rounded-xl min-h-32 focus:border-blue-500/50"
                />
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <Label className="text-white font-semibold text-base tracking-tight">Social Links (Optional)</Label>
                <div className="grid gap-4">
                  <Input
                    placeholder="Website URL"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-white/40 rounded-xl h-12 focus:border-blue-500/50"
                  />
                  <Input
                    placeholder="Telegram URL"
                    value={formData.telegram}
                    onChange={(e) => handleInputChange("telegram", e.target.value)}
                    className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-white/40 rounded-xl h-12 focus:border-blue-500/50"
                  />
                  <Input
                    placeholder="Twitter/X URL"
                    value={formData.twitter}
                    onChange={(e) => handleInputChange("twitter", e.target.value)}
                    className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-white/40 rounded-xl h-12 focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Lock Options */}
              <div className="space-y-4">
                <Label className="text-white font-semibold text-base tracking-tight">Security Options</Label>
                <RadioGroup
                  value={formData.lockOption}
                  onValueChange={(value) => handleInputChange("lockOption", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                    <RadioGroupItem value="no-lock" id="no-lock" className="border-white/30 text-blue-500" />
                    <Label htmlFor="no-lock" className="text-white cursor-pointer flex-1 font-medium">
                      No Lock
                      <p className="text-white/60 text-sm font-normal mt-1">Standard launch without lock mechanism</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                    <RadioGroupItem value="trust-me-bro" id="trust-me-bro" className="border-white/30 text-blue-500" />
                    <Label htmlFor="trust-me-bro" className="text-white cursor-pointer flex-1 font-medium">
                      Trust Me, Bro
                      <p className="text-white/60 text-sm font-normal mt-1">
                        Lock first 10% of SUI purchases for 3 days
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                    <RadioGroupItem
                      value="trust-me-3000"
                      id="trust-me-3000"
                      className="border-white/30 text-blue-500"
                    />
                    <Label htmlFor="trust-me-3000" className="text-white cursor-pointer flex-1 font-medium">
                      Trust Me 3000
                      <p className="text-white/60 text-sm font-normal mt-1">
                        Lock first 30% of SUI purchases for 3 days
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Submit Button */}
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg rounded-xl font-medium mt-8 transition-all duration-200 hover:scale-[1.02]"
              >
                Launch Token
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white">Live Preview</h2>
              <p className="text-white/70">See how your token will appear on the platform</p>
            </div>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview || "/placeholder.svg"}
                        alt="Preview"
                        width={64}
                        height={64}
                        className="rounded-xl"
                      />
                    ) : (
                      <span className="text-white/40 text-2xl font-bold">?</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-xl">
                      {formData.projectName || "Your Token Name"}
                      {formData.coinTicker && ` - ${formData.coinTicker}`}
                    </h3>
                    <p className="text-white/60 text-sm font-mono">0x0000...0000</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Created by</span>
                    <span className="text-blue-400 font-mono text-sm">0x9a5b...22a3</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Market Cap</span>
                    <div className="text-right">
                      <div className="text-white font-semibold">$0.00</div>
                      <div className="text-white/40 text-sm">(0%)</div>
                    </div>
                  </div>

                  {formData.description && (
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-white/70 text-sm leading-relaxed">{formData.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="bg-blue-600/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl">
              <CardContent className="p-6">
                <h3 className="text-white font-semibold text-lg mb-3">Security Features</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-white/80">Bonding curve mechanism</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-white/80">Automatic liquidity provision</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-white/80">Rug pull protection</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
