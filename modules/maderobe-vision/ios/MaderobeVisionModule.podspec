require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'MaderobeVisionModule'
  s.version        = package['version']
  s.summary        = 'Apple Vision wrapper for Maderobe.'
  s.description    = 'Local Expo module that wraps Apple Vision (classify, background removal, dominant colors) for on-device clothing image analysis. Used internally by the Maderobe iOS app.'
  s.license        = { :type => 'MIT' }
  s.author         = { 'Julien Duval' => 'julien.duval.patrimoine@gmail.com' }
  s.homepage       = 'https://github.com/Actaris51/maderobe'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/Actaris51/maderobe.git', :tag => "v#{s.version}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'

  # Apple frameworks used by the Swift code
  s.frameworks = 'Vision', 'CoreImage', 'UIKit', 'CoreGraphics'
end
