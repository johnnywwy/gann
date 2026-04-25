<template>
  <section class="hero-band">
    <p class="eyebrow">Gann Matrix Studio</p>
    <h1>九方图配置与趋势推演</h1>
  </section>
</template>

<style scoped>
.hero-band {
  margin-bottom: 16px;
  padding: 18px 22px;
  border: 1px solid rgba(47, 84, 235, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 14px 38px rgba(30, 57, 102, 0.07);
}

.eyebrow {
  margin: 0 0 6px;
  color: #2d6cdf;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  font-size: clamp(22px, 3.2vw, 30px);
  line-height: 1.15;
  color: #1f2a44;
}

@media (max-width: 860px) {
  .hero-band {
    padding: 14px 16px;
    border-radius: 16px;
  }
}

@media (max-width: 640px) {
  .hero-band {
    margin-bottom: 12px;
    padding: 12px 14px;
    border-radius: 14px;
  }

  .eyebrow {
    margin-bottom: 4px;
    font-size: 11px;
  }

  h1 {
    font-size: 22px;
    line-height: 1.2;
  }
}
</style>
