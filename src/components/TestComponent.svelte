<script>
  // Basic Svelte 5 component
  let name = "WaniKani Dashboard";
</script>

<div 
  style="position: fixed; top: 10px; right: 10px; background-color: #f0f0f0; border: 2px solid #ff3e00; padding: 10px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.2); border-radius: 5px;"
>
  <div style="color: #ff3e00; font-weight: bold; font-size: 16px;">
    Hello from {name}!
  </div>
</div>
