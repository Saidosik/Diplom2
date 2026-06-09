<?php

namespace Tests\Unit;

use App\Support\TagColor;
use PHPUnit\Framework\TestCase;

class TagColorTest extends TestCase
{
    public function test_contrast_ratio_uses_wcag_formula(): void
    {
        $this->assertSame(21.0, TagColor::contrastRatio('#000000', '#ffffff'));
        $this->assertSame('poor', TagColor::status(2.9));
        $this->assertSame('acceptable', TagColor::status(3.1));
        $this->assertSame('good', TagColor::status(4.5));
    }
}
