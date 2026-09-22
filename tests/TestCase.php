<?php
namespace Tests;

class TestCase
{
    protected int $assertions = 0;
    
    public function setUp(): void {}
    public function tearDown(): void {}

    protected function assertTrue(bool $condition, string $message = ''): void
    {
        $this->assertions++;
        if (!$condition) {
            throw new \Exception("Failed asserting that value is true. " . $message);
        }
    }

    protected function assertFalse(bool $condition, string $message = ''): void
    {
        $this->assertions++;
        if ($condition) {
            throw new \Exception("Failed asserting that value is false. " . $message);
        }
    }

    protected function assertEquals(mixed $expected, mixed $actual, string $message = ''): void
    {
        $this->assertions++;
        if ($expected !== $actual) {
            throw new \Exception("Failed asserting that " . var_export($expected, true) . " is equal to " . var_export($actual, true) . ". " . $message);
        }
    }

    protected function assertCount(int $expectedCount, array|\Countable $haystack, string $message = ''): void
    {
        $this->assertions++;
        $actualCount = count($haystack);
        if ($expectedCount !== $actualCount) {
            throw new \Exception("Failed asserting that size $actualCount matches expected size $expectedCount. " . $message);
        }
    }

    public function getAssertionsCount(): int
    {
        return $this->assertions;
    }
}
