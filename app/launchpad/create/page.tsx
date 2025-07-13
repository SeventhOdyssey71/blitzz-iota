"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Upload, ExternalLink, Copy, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useMemeTokenFactory } from "@/hooks/use-meme-token-factory"
import { useCurrentAccount } from "@iota/dapp-kit"
import { useWalletBalance } from "@/hooks/use-wallet-balance"
import { toast } from "sonner"
import { CREATION_FEE, PLATFORM_ID } from "@/lib/contracts/meme-token-factory"
import { MemeTokenService } from "@/lib/services/meme-token-service"

export default function CreateTokenPage() {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const { createToken, isLoading, formatTokenAmount } = useMemeTokenFactory()
  const { balance: iotaBalance } = useWalletBalance("0x2::iota::IOTA")
  const memeService = MemeTokenService.getInstance()
  
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast.error("Image size must be less than 1MB")
        return
      }
      
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateToken = async () => {
    // Validate inputs
    if (!formData.projectName || !formData.coinTicker || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!currentAccount) {
      toast.error("Please connect your wallet")
      return
    }

    if (formData.coinTicker.length < 2 || formData.coinTicker.length > 10) {
      toast.error("Token symbol must be between 2-10 characters")
      return
    }

    // Upload image to IPFS or use placeholder
    const imageUrl = avatarPreview || "https://placeholder.com/token.png"

    // Check balance
    if (!iotaBalance || BigInt(iotaBalance) < BigInt(CREATION_FEE)) {
      toast.error("Insufficient IOTA balance. You need at least 2 IOTA to create a token")
      return
    }

    // If using mock mode, use the service
    if (memeService.isInMockMode()) {
      const result = await memeService.createToken({
        symbol: formData.coinTicker.toUpperCase(),
        name: formData.projectName,
        description: formData.description,
        imageUrl: imageUrl,
        payment: {}, // Mock payment
      })

      if (result.success) {
        toast.success("Token created successfully!")
        router.push(`/launchpad/coin/${formData.coinTicker.toLowerCase()}`)
      } else {
        toast.error(result.error || "Failed to create token")
      }
    } else {
      // Use real contract
      await createToken(
        formData.coinTicker.toUpperCase(),
        formData.projectName,
        formData.description,
        imageUrl,
        (bondingCurveId) => {
          // Redirect to the token page
          router.push(`/launchpad/coin/${formData.coinTicker.toLowerCase()}`)
        }
      )
    }
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Form Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="sm" asChild className="text-gray-400 hover:text-white hover:bg-white/10">
                <Link href="/launchpad">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-white leading-none tracking-tighter">
                Create New
                <br />
                <span className="text-cyan-400">Meme Coin</span>
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed font-light">
                Launch your token on IOTA with our professional platform and built-in security features.
              </p>
              {memeService.isInMockMode() && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Launchpad contracts are not deployed yet. This is a preview mode.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {/* Avatar Upload */}
              <div className="space-y-4">
                <Label className="text-white font-semibold text-base tracking-tight">Token Avatar</Label>
                <p className="text-gray-400 text-sm">Upload an image for your token (Max 1MB)</p>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center glass-dark relative overflow-hidden hover:border-cyan-500/50 transition-colors">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview || "/placeholder.svg"}
                        alt="Avatar preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
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
                  className="bg-black/50 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 rounded-xl h-12 focus:border-cyan-500/50"
                />
              </div>

              {/* Coin Ticker */}
              <div className="space-y-3">
                <Label className="text-white font-semibold text-base tracking-tight">Token Symbol</Label>
                <Input
                  placeholder="e.g., MEME"
                  value={formData.coinTicker}
                  onChange={(e) => handleInputChange("coinTicker", e.target.value)}
                  className="bg-black/50 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 rounded-xl h-12 focus:border-cyan-500/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label className="text-white font-semibold text-base tracking-tight">Description</Label>
                <Textarea
                  placeholder="Describe your token and its purpose..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="bg-black/50 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 rounded-xl min-h-32 focus:border-cyan-500/50"
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
                    className="bg-black/50 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 rounded-xl h-12 focus:border-cyan-500/50"
                  />
                  <Input
                    placeholder="Telegram URL"
                    value={formData.telegram}
                    onChange={(e) => handleInputChange("telegram", e.target.value)}
                    className="bg-black/50 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 rounded-xl h-12 focus:border-cyan-500/50"
                  />
                  <Input
                    placeholder="Twitter/X URL"
                    value={formData.twitter}
                    onChange={(e) => handleInputChange("twitter", e.target.value)}
                    className="bg-black/50 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 rounded-xl h-12 focus:border-cyan-500/50"
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
                  <div className="flex items-center space-x-4 p-4 glass-dark rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors">
                    <RadioGroupItem value="no-lock" id="no-lock" className="border-gray-400 text-cyan-500" />
                    <Label htmlFor="no-lock" className="text-white cursor-pointer flex-1 font-medium">
                      No Lock
                      <p className="text-gray-400 text-sm font-normal mt-1">Standard launch without lock mechanism</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 p-4 glass-dark rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors">
                    <RadioGroupItem value="trust-me-bro" id="trust-me-bro" className="border-gray-400 text-cyan-500" />
                    <Label htmlFor="trust-me-bro" className="text-white cursor-pointer flex-1 font-medium">
                      Trust Me, Bro
                      <p className="text-gray-400 text-sm font-normal mt-1">
                        Lock first <span className="font-mono tabular-nums">10%</span> of IOTA purchases for <span className="font-mono tabular-nums">3</span> days
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 p-4 glass-dark rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors">
                    <RadioGroupItem
                      value="trust-me-3000"
                      id="trust-me-3000"
                      className="border-gray-400 text-cyan-500"
                    />
                    <Label htmlFor="trust-me-3000" className="text-white cursor-pointer flex-1 font-medium">
                      Trust Me 3000
                      <p className="text-gray-400 text-sm font-normal mt-1">
                        Lock first <span className="font-mono tabular-nums">30%</span> of IOTA purchases for <span className="font-mono tabular-nums">3</span> days
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Fee Information */}
              <div className="p-4 bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Creation Fee</span>
                  <span className="text-cyan-400 font-semibold font-mono tabular-nums">
                    {formatTokenAmount(CREATION_FEE.toString())} IOTA
                  </span>
                </div>
                <p className="text-white/60 text-sm mt-2">
                  This fee helps maintain the platform and prevent spam
                </p>
              </div>

              {/* Submit Button */}
              <Button
                size="lg"
                onClick={handleCreateToken}
                disabled={isLoading || !currentAccount}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black py-4 text-lg rounded-xl font-medium mt-8 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Token...
                  </>
                ) : !currentAccount ? (
                  "Connect Wallet to Launch"
                ) : (
                  "Launch Token"
                )}
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white">Live Preview</h2>
              <p className="text-gray-400">See how your token will appear on the platform</p>
            </div>

            <Card className="glass-dark border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 glass-dark rounded-2xl flex items-center justify-center border border-white/20">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview || "/placeholder.svg"}
                        alt="Preview"
                        width={64}
                        height={64}
                        className="rounded-xl"
                      />
                    ) : (
                      <span className="text-gray-400 text-2xl font-bold">?</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-xl">
                      {formData.projectName || "Your Token Name"}
                      {formData.coinTicker && ` - ${formData.coinTicker}`}
                    </h3>
                    <p className="text-gray-400 text-sm font-mono">0x0000...0000</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-2">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-2">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Created by</span>
                    <span className="text-cyan-400 font-mono text-sm">
                      {currentAccount ? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}` : "0x0000...0000"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Market Cap</span>
                    <div className="text-right">
                      <div className="text-white font-semibold font-mono tabular-nums">$0.00</div>
                      <div className="text-gray-400 text-sm font-mono tabular-nums">(0%)</div>
                    </div>
                  </div>

                  {formData.description && (
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-gray-400 text-sm leading-relaxed">{formData.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl">
              <CardContent className="p-6">
                <h3 className="text-white font-semibold text-lg mb-3">Security Features</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span className="text-white/80">Bonding curve mechanism</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span className="text-white/80">Automatic liquidity provision</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
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