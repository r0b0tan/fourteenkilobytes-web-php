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

    // -------------------------------------------------------------------------
    // minifyCss — additional branches
    // -------------------------------------------------------------------------

    public function testMinifyCssConvertsRgbaWhiteTransparentToKeyword(): void
    {
        $this->assertSame('a{background:transparent}', minifyCss('a{background:rgba(255,255,255,0)}'));
    }

    public function testMinifyCssShortensMixedCaseRepeatableHex(): void
    {
        // #AABBCC → #ABC (preserves case of the first digit in each pair)
        $result = minifyCss('a{color:#AABBCC}');
        $this->assertSame('a{color:#ABC}', $result);
    }

    // -------------------------------------------------------------------------
    // minifyHtmlDocument — additional branches
    // -------------------------------------------------------------------------

    public function testMinifyHtmlStripsStyleAttributeWhenCssBecomesEmpty(): void
    {
        // A style with only whitespace/comments becomes empty after minification → attribute removed
        $html = '<p style="/* comment */">Hello</p>';
        $result = minifyHtmlDocument($html);
        $this->assertStringNotContainsString('style=', $result);
        $this->assertStringContainsString('<p>', $result);
    }

    public function testMinifyHtmlSimplifiesAttributeQuotes(): void
    {
        // class="foo" → class=foo (only alphanumeric/dash/underscore values)
        $result = minifyHtmlDocument('<div class="container"><p id="main">Hi</p></div>');
        $this->assertStringContainsString('class=container', $result);
        $this->assertStringContainsString('id=main', $result);
    }

    // -------------------------------------------------------------------------
    // Whitespace between tags and calc() handling
    // -------------------------------------------------------------------------

    public function testMinifyHtmlKeepsSpaceBetweenInlineElements(): void
    {
        $result = minifyHtmlDocument('<p><b>Hallo</b> <i>Welt</i> und <a href="/x">Link</a>   <code>x</code></p>');
        $this->assertSame('<p><b>Hallo</b> <i>Welt</i> und <a href="/x">Link</a> <code>x</code></p>', $result);
    }

    public function testMinifyHtmlRemovesWhitespaceAroundBlockElements(): void
    {
        $result = minifyHtmlDocument("<ul>\n  <li>Eins</li>\n  <li>Zwei</li>\n</ul>\n<p>  <b>x</b> </p>");
        $this->assertSame('<ul><li>Eins</li><li>Zwei</li></ul><p><b>x</b></p>', $result);
    }

    public function testMinifyHtmlRemovesWhitespaceAfterDoctype(): void
    {
        $this->assertSame('<!DOCTYPE html><html></html>', minifyHtmlDocument("<!DOCTYPE html>\n<html>\n</html>"));
    }

    public function testMinifyHtmlPreservesWhitespaceInsidePre(): void
    {
        $html = "<pre><code><span>a</span>\n  <span>b</span></code></pre>";
        $this->assertSame($html, minifyHtmlDocument($html));
    }

    public function testMinifyHtmlIsIdempotent(): void
    {
        $once = minifyHtmlDocument("<div>\n<p><b>a</b> <i>b</i></p>\n<style>a{width:calc(100% + 2px)}</style></div>");
        $this->assertSame($once, minifyHtmlDocument($once));
    }

    public function testMinifyCssKeepsCalcOperatorSpacing(): void
    {
        $this->assertSame('a{width:calc(100% - 2rem);margin:calc(1rem + 2px)}', minifyCss('a { width: calc(100% - 2rem); margin: calc(1rem + 2px); }'));
    }

    public function testMinifyCssKeepsDescendantCombinatorBeforePseudoClass(): void
    {
        $this->assertSame('.b :first-child{color:red}', minifyCss('.b :first-child { color : red ; }'));
    }

    public function testMinifyCssLeavesQuotedStringsUntouched(): void
    {
        $this->assertSame('.c::before{content:"a : b  {x}"}', minifyCss('.c::before { content : "a : b  {x}" ; }'));
        $this->assertSame("a[title='x + y']{color:red}", minifyCss("a[title='x + y'] { color: red }"));
    }

    public function testMinifyCssDoesNotMergeSelectorsAcrossLineBreaks(): void
    {
        $this->assertSame('.g .h{padding:0}', minifyCss(".g\n.h { padding: 0rem }"));
    }
}
