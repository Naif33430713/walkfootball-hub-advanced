  <template>
    <div class="home">

      <section class="wf-banner">
        <div class="container">
          <div class="row">
            <div class="col-12 text-center">
              <h1 class="fade-in">Welcome to Walking Football</h1>
              <p class="lead fade-in">
                Join our inclusive community.
                Perfect for all ages, abilities, and fitness levels.
              </p>
              <div class="banner-actions fade-in">
                <router-link to="/programs" class="btn btn-accent btn-lg me-3">
                  View Programs
                </router-link>
                <router-link to="/register" class="btn btn-outline-light btn-lg">
                  Join Today
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section class="py-5">
        <div class="container-xxl">
          <div class="row text-center mb-5">
            <div class="col-12">
              <h2>Why Choose Walking Football?</h2>
              <p class="lead">Discover the benefits of this inclusive sport</p>
            </div>
          </div>

          <div class="row">
            <div class="col-12 col-sm-6 col-md-4 mb-4">
              <div class="card h-100 text-center">
                <div class="card-body">
                  <div class="mb-3">
                    <i class="fas fa-heart fa-3x text-primary"></i>
                  </div>
                  <h5 class="card-title">Health &amp; Fitness</h5>
                  <p class="card-text">
                    Low-impact exercise that improves cardiovascular health,
                    balance, and coordination while being gentle on joints.
                  </p>
                </div>
              </div>
            </div>

            <div class="col-12 col-sm-6 col-md-4 mb-4">
              <div class="card h-100 text-center">
                <div class="card-body">
                  <div class="mb-3">
                    <i class="fas fa-users fa-3x text-primary"></i>
                  </div>
                  <h5 class="card-title">Social Connection</h5>
                  <p class="card-text">
                    Build friendships and connect with your community through
                    shared experiences and team activities.
                  </p>
                </div>
              </div>
            </div>

            <div class="col-12 col-sm-6 col-md-4 mb-4">
              <div class="card h-100 text-center">
                <div class="card-body">
                  <div class="mb-3">
                    <i class="fas fa-universal-access fa-3x text-primary"></i>
                  </div>
                  <h5 class="card-title">Inclusive &amp; Accessible</h5>
                  <p class="card-text">
                    Designed for all abilities, ages, and fitness levels.
                    No running means everyone can participate safely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="py-5">
        <div class="container text-center">
          <h2>Ready to Get Started?</h2>
          <p class="lead mb-4">
            Join hundreds of people who have discovered the joy of walking football
          </p>
          <router-link to="/register" class="btn btn-primary btn-lg">
            Register Now
          </router-link>
        </div>
      </section>
    </div>
  </template>

  <style scoped>
  .wf-banner {
    background: linear-gradient(135deg, var(--primary-green), var(--secondary-green));
    color: #fff;
    padding: 4rem 0;
  }


  .banner-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }
  @media (max-width: 575.98px) {
    .banner-actions .btn {
      width: 100%;
    }
  }

  .wf-banner .btn-outline-light {
    color: #fff;
    border-color: #fff;
  }
  .wf-banner .btn-outline-light:hover {
    background: #fff;
    color: var(--primary-green);
  }


  .card {
    transition: transform 0.3s ease;
    border: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .card:hover { transform: translateY(-5px); }


  .text-primary { color: var(--primary-green) !important; }


  .fade-in { animation: fadeIn 1s ease-in; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  </style>
