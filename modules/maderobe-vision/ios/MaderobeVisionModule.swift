import ExpoModulesCore
import Vision
import CoreImage
import UIKit
import CoreGraphics

/// Local Expo module wrapping Apple Vision framework for on-device clothing image analysis.
///
/// Three primitives + one convenience method:
/// - `classifyImage(uri)`     → Vision classifier + mapping to wardrobe taxonomy
/// - `removeBackground(uri)`  → iOS 17+ foreground instance mask, PNG with alpha
/// - `extractDominantColors(uri, n)` → k-means on downscaled image
/// - `analyzeClothingItem(uri)` → all three combined in one image decode
///
/// All work happens on-device. No network, no API key, no cost.
public class MaderobeVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MaderobeVisionModule")

    AsyncFunction("classifyImage") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let image = Self.loadImage(from: uri) else {
          promise.reject("INVALID_URI", "Could not load image from URI: \(uri)")
          return
        }
        let labels = Self.runClassification(image: image)
        let type = Self.mapToClothingType(labels: labels)
        promise.resolve([
          "labels": labels.map { ["label": $0.label, "confidence": $0.confidence] },
          "type": type,
        ])
      }
    }

    AsyncFunction("removeBackground") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let image = Self.loadImage(from: uri) else {
          promise.reject("INVALID_URI", "Could not load image from URI: \(uri)")
          return
        }
        if #available(iOS 17.0, *) {
          if let masked = Self.removeBackgroundIOS17(image: image),
             let outUri = Self.saveImagePNG(masked, suffix: "bg-removed") {
            promise.resolve(["uri": outUri, "removed": true])
            return
          }
        }
        // Fallback: return the original URI
        promise.resolve(["uri": uri, "removed": false])
      }
    }

    AsyncFunction("extractDominantColors") { (uri: String, n: Int?, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let image = Self.loadImage(from: uri) else {
          promise.reject("INVALID_URI", "Could not load image from URI: \(uri)")
          return
        }
        let count = max(1, min(n ?? 3, 8))
        let colors = Self.extractDominantColors(image: image, n: count)
        promise.resolve(colors.map { Self.colorToDict($0) })
      }
    }

    AsyncFunction("analyzeClothingItem") { (uri: String, options: [String: Any]?, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let image = Self.loadImage(from: uri) else {
          promise.reject("INVALID_URI", "Could not load image from URI: \(uri)")
          return
        }

        let colorCount = max(1, min((options?["colorCount"] as? Int) ?? 3, 8))

        // Step 1 : try background removal (iOS 17+). Use the masked image for classification + colors
        // if available — gives much better signal than the raw photo.
        var workingImage = image
        var bgRemovedUri: String? = nil
        if #available(iOS 17.0, *) {
          if let masked = Self.removeBackgroundIOS17(image: image),
             let outUri = Self.saveImagePNG(masked, suffix: "bg-removed") {
            workingImage = masked
            bgRemovedUri = outUri
          }
        }

        // Step 2 : classification
        let labels = Self.runClassification(image: workingImage)
        let type = Self.mapToClothingType(labels: labels)

        // Step 3 : dominant colors (ignoring fully-transparent pixels)
        let colors = Self.extractDominantColors(image: workingImage, n: colorCount)

        var result: [String: Any] = [
          "labels": labels.map { ["label": $0.label, "confidence": $0.confidence] },
          "type": type,
          "colors": colors.map { Self.colorToDict($0) },
        ]
        if let uri = bgRemovedUri {
          result["backgroundRemovedUri"] = uri
        }
        promise.resolve(result)
      }
    }
  }

  // MARK: - Image loading

  /// Load a UIImage from a `file://` URI. Returns nil for `ph://`, `assets-library://`, network, or invalid paths.
  static func loadImage(from uri: String) -> UIImage? {
    if let url = URL(string: uri), url.isFileURL {
      return UIImage(contentsOfFile: url.path)
    }
    // Bare path without scheme
    if FileManager.default.fileExists(atPath: uri) {
      return UIImage(contentsOfFile: uri)
    }
    return nil
  }

  // MARK: - Classification

  struct ScoredLabel {
    let label: String
    let confidence: Float
  }

  static func runClassification(image: UIImage) -> [ScoredLabel] {
    guard let cgImage = image.cgImage else { return [] }
    let request = VNClassifyImageRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
      try handler.perform([request])
    } catch {
      return []
    }
    guard let observations = request.results else { return [] }
    // Keep top 8 with confidence >= 0.1
    return observations
      .filter { $0.confidence >= 0.1 }
      .prefix(8)
      .map { ScoredLabel(label: $0.identifier, confidence: $0.confidence) }
  }

  /// Map Vision's raw labels (~1000 ImageNet-style categories) to the Maderobe wardrobe taxonomy.
  /// Uses keyword matching rather than strict equality because the label set is broad.
  static func mapToClothingType(labels: [ScoredLabel]) -> String {
    // Iterate labels in confidence order; the first label whose keyword matches wins.
    for scored in labels {
      let label = scored.label.lowercased()

      if Self.containsAny(label, ["shoe", "sneaker", "boot", "sandal", "loafer", "heel", "pump", "slipper", "moccasin"]) {
        return "shoes"
      }
      if Self.containsAny(label, ["dress", "gown", "frock"]) {
        return "dress"
      }
      if Self.containsAny(label, ["coat", "jacket", "blazer", "parka", "raincoat", "overcoat", "trench"]) {
        return "outerwear"
      }
      if Self.containsAny(label, ["trouser", "jean", "pant", "short", "skirt", "legging", "chino", "slack"]) {
        return "bottom"
      }
      if Self.containsAny(label, ["shirt", "jersey", "tee", "blouse", "sweater", "sweatshirt", "cardigan", "tank", "polo", "hoodie", "pullover"]) {
        return "top"
      }
      if Self.containsAny(label, ["bag", "purse", "handbag", "backpack", "tote", "satchel", "wallet"]) {
        return "bag"
      }
      if Self.containsAny(label, ["belt", "buckle"]) {
        return "belt"
      }
      if Self.containsAny(label, ["watch", "necklace", "ring", "bracelet", "earring", "pendant", "jewelry"]) {
        return "jewelry"
      }
      if Self.containsAny(label, ["hat", "cap", "beanie", "beret", "scarf", "tie", "necktie", "bowtie", "glove", "mitten", "sunglass", "glasses", "umbrella"]) {
        return "accessory"
      }
    }
    return "unknown"
  }

  static func containsAny(_ haystack: String, _ needles: [String]) -> Bool {
    for n in needles where haystack.contains(n) { return true }
    return false
  }

  // MARK: - Background removal (iOS 17+)

  @available(iOS 17.0, *)
  static func removeBackgroundIOS17(image: UIImage) -> UIImage? {
    guard let cgImage = image.cgImage else { return nil }
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage)
    do {
      try handler.perform([request])
    } catch {
      return nil
    }
    guard let observation = request.results?.first else { return nil }
    do {
      let pixelBuffer = try observation.generateMaskedImage(
        ofInstances: observation.allInstances,
        from: handler,
        croppedToInstancesExtent: true
      )
      let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
      let context = CIContext()
      guard let outputCG = context.createCGImage(ciImage, from: ciImage.extent) else { return nil }
      return UIImage(cgImage: outputCG, scale: image.scale, orientation: image.imageOrientation)
    } catch {
      return nil
    }
  }

  // MARK: - File output

  /// Save a UIImage as PNG (preserves alpha) in the app's cache directory and return its file:// URI.
  static func saveImagePNG(_ image: UIImage, suffix: String) -> String? {
    guard let pngData = image.pngData() else { return nil }
    let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
    guard let dir = cachesDir else { return nil }
    let subDir = dir.appendingPathComponent("maderobe-vision", isDirectory: true)
    try? FileManager.default.createDirectory(at: subDir, withIntermediateDirectories: true)
    let filename = "\(suffix)-\(UUID().uuidString).png"
    let fileURL = subDir.appendingPathComponent(filename)
    do {
      try pngData.write(to: fileURL)
      return fileURL.absoluteString
    } catch {
      return nil
    }
  }

  // MARK: - Dominant colors (k-means)

  struct PixelRGB {
    let r: UInt8
    let g: UInt8
    let b: UInt8
  }

  struct ColorCluster {
    let r: UInt8
    let g: UInt8
    let b: UInt8
    let weight: Float
  }

  /// Extract the N dominant colors from an image via k-means clustering.
  /// Downscales to 100×100 first for performance (target: < 100ms on iPhone 13).
  /// Ignores fully-transparent pixels (so background-removed images give clean clothing colors).
  static func extractDominantColors(image: UIImage, n: Int) -> [ColorCluster] {
    let pixels = extractPixels(from: image, targetSide: 100)
    guard pixels.count > 0 else { return [] }
    return kmeans(pixels: pixels, k: n, maxIter: 8)
  }

  /// Downscale and extract RGB pixels. Skips pixels with alpha < 128.
  static func extractPixels(from image: UIImage, targetSide: Int) -> [PixelRGB] {
    let size = CGSize(width: targetSide, height: targetSide)
    UIGraphicsBeginImageContextWithOptions(size, false, 1.0)
    image.draw(in: CGRect(origin: .zero, size: size))
    let scaled = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    guard let cgImage = scaled?.cgImage else { return [] }

    let width = cgImage.width
    let height = cgImage.height
    let bytesPerRow = width * 4
    var rawData = [UInt8](repeating: 0, count: width * height * 4)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
    guard let context = CGContext(
      data: &rawData,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: bytesPerRow,
      space: colorSpace,
      bitmapInfo: bitmapInfo
    ) else { return [] }
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

    var pixels: [PixelRGB] = []
    pixels.reserveCapacity(width * height)
    var i = 0
    while i < rawData.count {
      let alpha = rawData[i + 3]
      if alpha >= 128 {
        // De-premultiply: since we used premultipliedLast, raw r/g/b are already premultiplied.
        // For non-fully-opaque pixels this would skew, but with alpha >= 128 the skew is small enough
        // for color clustering purposes.
        pixels.append(PixelRGB(r: rawData[i], g: rawData[i + 1], b: rawData[i + 2]))
      }
      i += 4
    }
    return pixels
  }

  /// Simple k-means clustering on RGB pixels. Returns clusters sorted by descending weight.
  static func kmeans(pixels: [PixelRGB], k: Int, maxIter: Int) -> [ColorCluster] {
    guard pixels.count > 0, k > 0 else { return [] }
    let actualK = min(k, pixels.count)

    // Init centers by sampling pixels at regular intervals (deterministic, avoids bad random init)
    var centers: [PixelRGB] = (0..<actualK).map { i in
      pixels[(i * pixels.count) / actualK]
    }

    for _ in 0..<maxIter {
      // Assign each pixel to nearest center
      var sumsR = [Int](repeating: 0, count: actualK)
      var sumsG = [Int](repeating: 0, count: actualK)
      var sumsB = [Int](repeating: 0, count: actualK)
      var counts = [Int](repeating: 0, count: actualK)

      for p in pixels {
        var bestI = 0
        var bestDist = Int.max
        for (i, c) in centers.enumerated() {
          let dr = Int(p.r) - Int(c.r)
          let dg = Int(p.g) - Int(c.g)
          let db = Int(p.b) - Int(c.b)
          let dist = dr * dr + dg * dg + db * db
          if dist < bestDist {
            bestDist = dist
            bestI = i
          }
        }
        sumsR[bestI] += Int(p.r)
        sumsG[bestI] += Int(p.g)
        sumsB[bestI] += Int(p.b)
        counts[bestI] += 1
      }

      // Recompute centers as cluster means
      for i in 0..<actualK where counts[i] > 0 {
        centers[i] = PixelRGB(
          r: UInt8(sumsR[i] / counts[i]),
          g: UInt8(sumsG[i] / counts[i]),
          b: UInt8(sumsB[i] / counts[i])
        )
      }
    }

    // Final pass: count members of each cluster to compute weights
    var finalCounts = [Int](repeating: 0, count: actualK)
    for p in pixels {
      var bestI = 0
      var bestDist = Int.max
      for (i, c) in centers.enumerated() {
        let dr = Int(p.r) - Int(c.r)
        let dg = Int(p.g) - Int(c.g)
        let db = Int(p.b) - Int(c.b)
        let dist = dr * dr + dg * dg + db * db
        if dist < bestDist {
          bestDist = dist
          bestI = i
        }
      }
      finalCounts[bestI] += 1
    }

    let total = Float(pixels.count)
    var clusters: [ColorCluster] = (0..<actualK).map { i in
      ColorCluster(r: centers[i].r, g: centers[i].g, b: centers[i].b, weight: Float(finalCounts[i]) / total)
    }
    clusters.sort { $0.weight > $1.weight }
    return clusters
  }

  static func colorToDict(_ c: ColorCluster) -> [String: Any] {
    return [
      "hex": String(format: "#%02x%02x%02x", c.r, c.g, c.b),
      "r": Int(c.r),
      "g": Int(c.g),
      "b": Int(c.b),
      "weight": c.weight,
    ]
  }
}
