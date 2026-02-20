<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class HttpTest extends TestCase
{
    // -------------------------------------------------------------------------
    // minifyCss
    // -------------------------------------------------------------------------

    public function testMinifyCssRemovesBlockComments(): void
    {
        $this->assertSame('a{color:red}', minifyCss('/* comment */a { color: red }'));
    }

    public function testMinifyCssCollapsesWhitespace(): void
    {
        $result = minifyCss("a {\n  color:   red;\n}");
        $this->assertSame('a{color:red}', $result);
    }

    public function testMinifyCssRemovesTrailingSemicolon(): void
    {
        $this->assertSame('a{color:red}', minifyCss('a{color:red;}'));
    }

    public function testMinifyCssRemovesUnitsFromZero(): void
    {
        $this->assertSame('a{margin:0}', minifyCss('a{margin:0px}'));
        $this->assertSame('a{padding:0}', minifyCss('a{padding:0rem}'));
    }

    public function testMinifyCssShortensSixDigitHexToThree(): void
    {
        $this->assertSame('a{color:#fff}', minifyCss('a{color:#ffffff}'));
        $this->assertSame('a{color:#abc}', minifyCss('a{color:#aabbcc}'));
    }

    public function testMinifyCssPreservesNonRepeatableHex(): void
    {
        $result = minifyCss('a{color:#1a2b3c}');
        $this->assertStringContainsString('#1a2b3c', $result);
    }

    public function testMinifyCssHandlesEmptyString(): void
    {
        $this->assertSame('', minifyCss(''));
    }

    public function testMinifyCssRemovesSpacesAroundBraces(): void
    {
        $this->assertSame('a{color:red}b{color:blue}', minifyCss('a { color: red } b { color: blue }'));
    }

    // -------------------------------------------------------------------------
    // minifyHtmlDocument
    // -------------------------------------------------------------------------

    public function testMinifyHtmlRemovesHtmlComments(): void
    {
        $result = minifyHtmlDocument('<!-- comment --><p>Hello</p>');
        $this->assertStringNotContainsString('<!-- comment -->', $result);
        $this->assertStringContainsString('<p>Hello</p>', $result);
    }

    public function testMinifyHtmlCollapsesWhitespaceBetweenTags(): void
    {
        $result = minifyHtmlDocument("<div>\n  <p>Hi</p>\n</div>");
        $this->assertStringNotContainsString("\n", $result);
        $this->assertStringContainsString('<p>Hi</p>', $result);
    }

    public function testMinifyHtmlMinifiesInlineStyleTag(): void
    {
        $html = '<style>a { color: red; }</style>';
        $result = minifyHtmlDocument($html);
        $this->assertStringContainsString('color:red', $result);
        $this->assertStringNotContainsString('color: red', $result);
    }

    public function testMinifyHtmlMinifiesInlineStyleAttribute(): void
    {
        $html = '<p style="color: red; margin: 0px">Hi</p>';
        $result = minifyHtmlDocument($html);
        $this->assertStringContainsString('color:red', $result);
        $this->assertStringContainsString('margin:0', $result);
    }

    public function testMinifyHtmlPreservesConditionalComments(): void
    {
        $html = '<!--[if IE]>old<![endif]--><p>Hi</p>';
        $result = minifyHtmlDocument($html);
        $this->assertStringContainsString('<!--[if IE]>', $result);
    }

    // -------------------------------------------------------------------------
    // isCompressionEnabled
    // -------------------------------------------------------------------------

    public function testIsCompressionEnabledDefaultsToTrue(): void
    {
        $this->assertTrue(isCompressionEnabled([]));
    }

    public function testIsCompressionEnabledCanBeDisabled(): void
    {
        $settings = ['optimizations' => ['compression' => ['enabled' => false]]];
        $this->assertFalse(isCompressionEnabled($settings));
    }

    public function testIsCompressionEnabledWhenExplicitlyEnabled(): void
    {
        $settings = ['optimizations' => ['compression' => ['enabled' => true]]];
        $this->assertTrue(isCompressionEnabled($settings));
    }
}
